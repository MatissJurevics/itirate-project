import { z } from 'zod';
import { tool } from 'ai';
import { pool } from '@/lib/postgres-client';

const savePreparedChartSchema = z.object({
  csvId: z.string().describe('UUID of the CSV file this chart is based on'),
  sqlQuery: z.string().describe('The SQL query that generated the data'),
  chartOptions: z.object({}).passthrough().describe('Complete Highcharts configuration object'),
  chartType: z.string().describe('Type of chart (line, bar, pie, scatter, etc.)'),
  userPrompt: z.string().optional().describe('Original user question/prompt')
});

export const savePreparedChart = tool({
  description: 'Save chart configuration to the database',
  inputSchema: savePreparedChartSchema,
  execute: async ({ csvId, sqlQuery, chartOptions, chartType, userPrompt }) => {
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
              csv_id UUID NOT NULL,
              chart_options JSONB NOT NULL,
              sql_query TEXT NOT NULL,
              chart_type TEXT,
              user_prompt TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `);

          // Insert the chart
          const result = await client.query(`
            INSERT INTO charts (csv_id, chart_options, sql_query, chart_type, user_prompt)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
          `, [csvId, chartOptions, sqlQuery, chartType, userPrompt]);

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