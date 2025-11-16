import { z } from 'zod';
import { tool } from 'ai';
import { pool } from '@/lib/postgres-client';
import { WidgetAnalyzer } from './services/widget-analyzer';
import { updateWidget } from './ai/widget-updater-tool';

const updateDashboardWidgetSchema = z.object({
  dashboardId: z.string().describe('ID of the dashboard containing the widget'),
  widgetId: z.string().describe('ID of the widget to update'),
  updatePrompt: z.string().describe('User prompt describing desired changes'),
  newChartOptions: z.object({}).passthrough().optional().describe('Optional direct Highcharts configuration override'),
  newTitle: z.string().optional().describe('Optional new title for the widget'),
  newChartType: z.string().optional().describe('Optional new chart type (line, bar, pie, etc.)'),
});

export interface UpdateWidgetResult {
  success: boolean;
  widgetId?: string;
  dashboardId?: string;
  originalWidget?: any;
  updatedWidget?: any;
  changes?: {
    updateType: string;
    specificChanges: any;
    warnings: string[];
  };
  message?: string;
  error?: string;
}

export const updateDashboardWidget = tool({
  description: 'Update an existing widget configuration in the dashboard widgets JSONB column',
  inputSchema: updateDashboardWidgetSchema,
  execute: async ({ dashboardId, widgetId, updatePrompt, newChartOptions, newTitle, newChartType }) => {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🔄 === UPDATING WIDGET (Attempt ${attempt}/${maxRetries}) ===`);
        console.log('🎯 Widget ID:', widgetId);
        console.log('📊 Dashboard ID:', dashboardId);
        console.log('💬 Update Prompt:', updatePrompt);
        console.log('🏷️  New Title:', newTitle);
        console.log('📈 New Chart Type:', newChartType);
        
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
          
          // Get current dashboard and find the widget
          const dashboardResult = await client.query(`
            SELECT widgets FROM dashboards WHERE id = $1
          `, [dashboardId]);

          if (dashboardResult.rows.length === 0) {
            throw new Error(`Dashboard with ID ${dashboardId} not found`);
          }

          const existingWidgets = dashboardResult.rows[0].widgets || [];
          const widgetIndex = existingWidgets.findIndex((w: any) => w.id === widgetId);

          if (widgetIndex === -1) {
            throw new Error(`Widget with ID ${widgetId} not found in dashboard`);
          }

          const originalWidget = existingWidgets[widgetIndex];
          console.log(`📋 Found widget: ${originalWidget.title || originalWidget.type || 'Untitled'}`);

          let updatedWidget: any;

          // If direct chart options provided, use them
          if (newChartOptions) {
            console.log('🎨 Using provided chart options');
            updatedWidget = {
              ...originalWidget,
              highchartsConfig: newChartOptions,
              title: newTitle || originalWidget.title,
              type: newChartType || originalWidget.type,
              metadata: {
                ...originalWidget.metadata,
                lastUpdated: new Date().toISOString(),
                updatePrompt: updatePrompt
              }
            };
          } else {
            console.log('🤖 Using AI to update widget configuration');
            
            // Use AI to update the widget configuration
            const updateResult = await updateWidget(
              originalWidget.highchartsConfig || {},
              updatePrompt,
              widgetId
            );

            if (!updateResult.success) {
              throw new Error(`AI update failed: ${updateResult.errors?.join(', ') || 'Unknown error'}`);
            }

            // Apply the AI-generated update
            updatedWidget = {
              ...originalWidget,
              highchartsConfig: updateResult.updatedConfig,
              title: newTitle || originalWidget.title,
              type: newChartType || updateResult.interpretation?.specificChanges?.newChartType || originalWidget.type,
              metadata: {
                ...originalWidget.metadata,
                lastUpdated: new Date().toISOString(),
                updatePrompt: updatePrompt
              }
            };

            // Log the changes
            if (updateResult.interpretation) {
              console.log(`🎯 Update type: ${updateResult.interpretation.updateType}`);
              console.log(`🎨 Changes: ${JSON.stringify(updateResult.interpretation.specificChanges)}`);
              if (updateResult.warnings && updateResult.warnings.length > 0) {
                console.log(`⚠️  Warnings: ${updateResult.warnings.join(', ')}`);
              }
            }
          }

          // Update the widgets array
          const updatedWidgets = [...existingWidgets];
          updatedWidgets[widgetIndex] = updatedWidget;

          // Save back to database
          const updateDashboardResult = await client.query(`
            UPDATE dashboards 
            SET widgets = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id
          `, [JSON.stringify(updatedWidgets), dashboardId]);

          if (updateDashboardResult.rows.length === 0) {
            throw new Error('Failed to update dashboard');
          }

          console.log('✅ Widget updated successfully');
          console.log('🎯 Widget ID:', widgetId);
          console.log('=====================================\n');
          
          const result: UpdateWidgetResult = {
            success: true,
            widgetId: widgetId,
            dashboardId: dashboardId,
            originalWidget: originalWidget,
            updatedWidget: updatedWidget,
            message: `Widget updated successfully: ${updatePrompt}`,
          };

          // Add changes info if AI was used
          if (!newChartOptions) {
            const analysisResult = await updateWidget(
              originalWidget.highchartsConfig || {},
              updatePrompt,
              widgetId
            );
            
            if (analysisResult.interpretation) {
              result.changes = {
                updateType: analysisResult.interpretation.updateType,
                specificChanges: analysisResult.interpretation.specificChanges,
                warnings: analysisResult.warnings || []
              };
            }
          }

          return result;

        } finally {
          try {
            client.release();
          } catch (releaseError) {
            console.error('Error releasing client:', releaseError);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error occurred');
        console.error(`💥 Error updating widget (attempt ${attempt}):`, lastError.message);
        
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
      message: 'Failed to update widget after multiple attempts'
    };
  }
});

// Standalone function for direct usage
export async function updateWidgetInDashboard(
  dashboardId: string,
  widgetId: string,
  updatePrompt: string,
  options: {
    newChartOptions?: any;
    newTitle?: string;
    newChartType?: string;
  } = {}
): Promise<UpdateWidgetResult> {
  const result = await updateDashboardWidget.execute({
    dashboardId,
    widgetId,
    updatePrompt,
    newChartOptions: options.newChartOptions,
    newTitle: options.newTitle,
    newChartType: options.newChartType,
  }, {
    toolCallId: 'direct-call',
    messages: [],
    abortSignal: undefined,
  });

  return result as UpdateWidgetResult;
}