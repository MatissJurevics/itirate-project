import { z } from 'zod';
import { tool } from 'ai';
import { pool } from '@/lib/postgres-client';

const deleteWidgetSchema = z.object({
  dashboardId: z.string().describe('ID of the dashboard containing the widget'),
  widgetIdentifier: z.string().describe('How to identify the widget: "first", "second", "last", or partial title/type match'),
  confirmDeletion: z.boolean().optional().default(true).describe('Confirmation that deletion should proceed')
});

export interface DeleteWidgetResult {
  success: boolean;
  widgetId?: string;
  dashboardId?: string;
  deletedWidget?: any;
  message?: string;
  error?: string;
  availableWidgets?: string[];
}

export const deleteDashboardWidget = tool({
  description: 'Delete an existing widget from the dashboard widgets JSONB column',
  inputSchema: deleteWidgetSchema,
  execute: async ({ dashboardId, widgetIdentifier, confirmDeletion }) => {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🗑️  === DELETING WIDGET (Attempt ${attempt}/${maxRetries}) ===`);
        console.log('🎯 Widget Identifier:', widgetIdentifier);
        console.log('📊 Dashboard ID:', dashboardId);
        console.log('✅ Confirmed:', confirmDeletion);
        
        if (!confirmDeletion) {
          return {
            success: false,
            error: 'Deletion not confirmed. Widget deletion requires confirmation.',
            message: 'Please confirm that you want to delete this widget.'
          };
        }
        
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
          
          if (existingWidgets.length === 0) {
            return {
              success: false,
              error: 'No widgets found in this dashboard',
              message: 'Cannot delete widget from empty dashboard'
            };
          }

          // Find the widget to delete using same logic as update_widget
          let targetWidget = null;
          let widgetIndex = -1;
          const identifier = widgetIdentifier.toLowerCase();

          // Position-based identification
          if (identifier === 'first') {
            targetWidget = existingWidgets[0];
            widgetIndex = 0;
          } else if (identifier === 'second' && existingWidgets.length > 1) {
            targetWidget = existingWidgets[1];
            widgetIndex = 1;
          } else if (identifier === 'third' && existingWidgets.length > 2) {
            targetWidget = existingWidgets[2];
            widgetIndex = 2;
          } else if (identifier === 'last') {
            targetWidget = existingWidgets[existingWidgets.length - 1];
            widgetIndex = existingWidgets.length - 1;
          } else {
            // Search by title or type match
            for (let i = 0; i < existingWidgets.length; i++) {
              const widget = existingWidgets[i];
              const title = (widget.title || '').toLowerCase();
              const type = (widget.type || '').toLowerCase();
              
              if (title.includes(identifier) || type.includes(identifier)) {
                targetWidget = widget;
                widgetIndex = i;
                break;
              }
            }
          }

          if (!targetWidget) {
            const availableWidgets = existingWidgets.map((w: any, i: number) => 
              `${i + 1}. ${w.title || w.type || 'Untitled'} (${w.type || 'unknown type'})`
            );
            
            return {
              success: false,
              error: `Could not find widget matching "${widgetIdentifier}"`,
              message: `No widget found with identifier "${widgetIdentifier}". Available widgets: ${availableWidgets.join(', ')}`,
              availableWidgets
            };
          }

          console.log(`🎯 Found widget to delete: ${targetWidget.title || targetWidget.type || 'Untitled'} (index: ${widgetIndex})`);

          // Remove the widget from the array
          const updatedWidgets = [...existingWidgets];
          const deletedWidget = updatedWidgets.splice(widgetIndex, 1)[0];

          // Save back to database
          const updateDashboardResult = await client.query(`
            UPDATE dashboards 
            SET widgets = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id
          `, [JSON.stringify(updatedWidgets), dashboardId]);

          if (updateDashboardResult.rows.length === 0) {
            throw new Error('Failed to update dashboard after widget deletion');
          }

          const widgetDescription = `${deletedWidget.title || 'Untitled'} (${deletedWidget.type || 'unknown type'})`;
          
          console.log('✅ Widget deleted successfully');
          console.log(`🗑️  Deleted: ${widgetDescription}`);
          console.log(`📊 Remaining widgets: ${updatedWidgets.length}`);
          console.log('=====================================\n');
          
          return {
            success: true,
            widgetId: deletedWidget.id,
            dashboardId: dashboardId,
            deletedWidget: deletedWidget,
            message: `Successfully deleted widget: ${widgetDescription}. Dashboard now has ${updatedWidgets.length} widget${updatedWidgets.length !== 1 ? 's' : ''}.`
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
        console.error(`💥 Error deleting widget (attempt ${attempt}):`, lastError.message);
        
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
      message: 'Failed to delete widget after multiple attempts'
    };
  }
});

// Standalone function for direct usage
export async function deleteWidgetFromDashboard(
  dashboardId: string,
  widgetIdentifier: string,
  confirmDeletion: boolean = true
): Promise<DeleteWidgetResult> {
  const result = await deleteDashboardWidget.execute({
    dashboardId,
    widgetIdentifier,
    confirmDeletion,
  }, {
    toolCallId: 'direct-call',
    messages: [],
    abortSignal: undefined,
  });

  return result as DeleteWidgetResult;
}