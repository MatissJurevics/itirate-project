import { z } from 'zod';
import { tool } from 'ai';
import { pool } from '@/lib/postgres-client';

const savePreparedChartSchema = z.object({
  csvId: z.string().describe('ID of the CSV file this chart is based on'),
  sqlQuery: z.string().describe('The SQL query that generated the data'),
  chartOptions: z.object({}).passthrough().describe('Complete Highcharts configuration object'),
  chartType: z.string().describe('Type of chart (line, bar, pie, scatter, etc.)'),
  userPrompt: z.string().optional().describe('Original user question/prompt'),
  dashboardId: z.string().optional().describe('Dashboard ID to link this chart to')
});

export const savePreparedChart = tool({
  description: 'Save chart configuration to the database',
  inputSchema: savePreparedChartSchema,
  execute: async ({ csvId, sqlQuery, chartOptions, chartType, userPrompt, dashboardId }) => {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🎯 === SAVING CHART TO DATABASE (Attempt ${attempt}/${maxRetries}) ===`);
        console.log('📊 Chart Type:', chartType);
        console.log('💬 User Prompt:', userPrompt);
        console.log('🗂️  CSV ID:', csvId);
        
        // Use a timeout wrapper for the connection
        const client = await Promise.race([
          pool.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection acquisition timeout')), 15000)
          )
        ]) as any;
        
        try {
          // Set a statement timeout for this session
          await client.query('SET statement_timeout = 30000');
          
          // Create table if it doesn't exist
          await client.query(`
            CREATE TABLE IF NOT EXISTS charts (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              csv_id TEXT NOT NULL,
              chart_options JSONB NOT NULL,
              sql_query TEXT NOT NULL,
              chart_type TEXT,
              user_prompt TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE
            );
          `);

          // Migrate csv_id column from UUID to TEXT if needed (handles existing tables)
          await client.query(`
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'charts' AND column_name = 'csv_id' AND data_type = 'uuid'
              ) THEN
                ALTER TABLE charts ALTER COLUMN csv_id TYPE TEXT;
            END IF;
          END $$;
        `);

          // Ensure dashboard_id column exists for linking charts to dashboards
          await client.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'charts' AND column_name = 'dashboard_id'
              ) THEN
                ALTER TABLE charts ADD COLUMN dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE;
              END IF;
            END $$;
          `);

          // Insert the chart with optional dashboard_id
          const result = await client.query(`
            INSERT INTO charts (csv_id, chart_options, sql_query, chart_type, user_prompt, dashboard_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
          `, [csvId, chartOptions, sqlQuery, chartType, userPrompt, dashboardId || null]);

          console.log('✅ Chart saved successfully with ID:', result.rows[0].id);
          console.log('=====================================\n');
          
          return {
            success: true,
            chartId: result.rows[0].id,
            message: `Chart configuration saved successfully. Type: ${chartType}`,
            savedAt: new Date().toISOString()
          };
        } finally {
          try {
            client.release();
          } catch (releaseError) {
            console.error('Error releasing client:', releaseError);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.error(`💥 Error saving chart (attempt ${attempt}):`, lastError.message);
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // If we get here, all attempts failed
    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
      message: 'Failed to save chart configuration after multiple attempts'
    };
  }
});
