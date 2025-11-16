import { z } from 'zod';
import { tool } from 'ai';
import { pool } from '@/lib/postgres-client';

const saveDashboardWidgetSchema = z.object({
  dashboardId: z.string().describe('ID of the dashboard to add the widget to'),
  sqlQuery: z.string().describe('The SQL query that generated the data'),
  chartOptions: z.object({}).passthrough().describe('Complete Highcharts configuration object'),
  chartType: z.string().describe('Type of chart (line, bar, pie, scatter, etc.)'),
  userPrompt: z.string().optional().describe('Original user question/prompt'),
  title: z.string().optional().describe('Title for the widget')
});

export const saveDashboardWidget = tool({
  description: 'Save chart widget to the dashboard widgets JSONB column',
  inputSchema: saveDashboardWidgetSchema,
  execute: async ({ dashboardId, sqlQuery, chartOptions, chartType, userPrompt, title }) => {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🎯 === SAVING WIDGET TO DASHBOARD (Attempt ${attempt}/${maxRetries}) ===`);
        console.log('📊 Chart Type:', chartType);
        console.log('💬 User Prompt:', userPrompt);
        console.log('🏷️  Dashboard ID:', dashboardId);
        console.log('🏷️  Title:', title);
        
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
          
          // Create the widget object in the format expected by the frontend
          const newWidget = {
            id: `widget_${Date.now()}`,
            type: chartType,
            title: title || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
            highchartsConfig: chartOptions,
            data: null, // Will be populated when chart is rendered
            metadata: {
              sqlQuery,
              userPrompt,
              createdAt: new Date().toISOString()
            }
          };

          // Get current dashboard
          const dashboardResult = await client.query(`
            SELECT widgets FROM dashboards WHERE id = $1
          `, [dashboardId]);

          if (dashboardResult.rows.length === 0) {
            throw new Error(`Dashboard with ID ${dashboardId} not found`);
          }

          // Get existing widgets or initialize empty array
          const existingWidgets = dashboardResult.rows[0].widgets || [];
          const updatedWidgets = [...existingWidgets, newWidget];

          // Update the dashboard with the new widget
          const updateResult = await client.query(`
            UPDATE dashboards 
            SET widgets = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id
          `, [JSON.stringify(updatedWidgets), dashboardId]);

          if (updateResult.rows.length === 0) {
            throw new Error('Failed to update dashboard');
          }

          console.log('✅ Widget saved successfully to dashboard:', dashboardId);
          console.log('🎯 Widget ID:', newWidget.id);
          console.log('=====================================\n');
          
          return {
            success: true,
            widgetId: newWidget.id,
            dashboardId: dashboardId,
            widget: newWidget,
            message: `Widget saved successfully to dashboard. Type: ${chartType}`,
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
        console.error(`💥 Error saving widget (attempt ${attempt}):`, lastError.message);
        
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
      message: 'Failed to save widget to dashboard after multiple attempts'
    };
  }
});