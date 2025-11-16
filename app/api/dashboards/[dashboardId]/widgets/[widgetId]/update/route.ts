import { updateWidgetInDashboard } from '@/lib/update-widget-tool';

interface RequestBody {
  updatePrompt: string;
  newChartOptions?: any;
  newTitle?: string;
  newChartType?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ dashboardId: string; widgetId: string }> }
) {
  try {
    const { dashboardId, widgetId } = await params;
    const body: RequestBody = await req.json();
    
    const {
      updatePrompt,
      newChartOptions,
      newTitle,
      newChartType
    } = body;

    if (!updatePrompt) {
      return Response.json(
        { error: 'updatePrompt is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 === WIDGET UPDATE API ===`);
    console.log(`📊 Dashboard ID: ${dashboardId}`);
    console.log(`🎯 Widget ID: ${widgetId}`);
    console.log(`💬 Update Prompt: ${updatePrompt}`);
    console.log(`🏷️  New Title: ${newTitle || 'None'}`);
    console.log(`📈 New Chart Type: ${newChartType || 'None'}`);

    // Update the widget
    const result = await updateWidgetInDashboard(
      dashboardId,
      widgetId,
      updatePrompt,
      {
        newChartOptions,
        newTitle,
        newChartType
      }
    );

    if (!result.success) {
      return Response.json(
        { 
          error: result.error || 'Failed to update widget',
          message: result.message 
        },
        { status: 400 }
      );
    }

    console.log('✅ Widget updated successfully via API');
    console.log('=====================================');

    // Return success response
    return Response.json({
      success: true,
      widgetId: result.widgetId,
      dashboardId: result.dashboardId,
      message: result.message,
      changes: result.changes,
      updatedWidget: {
        id: result.updatedWidget?.id,
        title: result.updatedWidget?.title,
        type: result.updatedWidget?.type,
        lastUpdated: result.updatedWidget?.metadata?.lastUpdated
      },
      warnings: result.changes?.warnings || []
    });

  } catch (error) {
    console.error('Widget update API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ dashboardId: string; widgetId: string }> }
) {
  try {
    const { dashboardId, widgetId } = await params;

    console.log(`📋 Getting widget info: ${widgetId} from dashboard: ${dashboardId}`);

    // This would fetch widget info for update preview
    // For now, return basic info
    return Response.json({
      dashboardId,
      widgetId,
      message: 'Widget update endpoint is ready. Use PATCH to update the widget.',
      availableOperations: [
        'Chart type changes (pie, line, bar, column, scatter, area)',
        'Color and styling updates', 
        'Title modifications',
        'Legend show/hide',
        'Axis label changes',
        'Data filtering (limited)'
      ],
      exampleRequests: [
        {
          updatePrompt: 'Make this a pie chart',
          description: 'Changes chart type to pie'
        },
        {
          updatePrompt: 'Change colors to blue',
          description: 'Updates chart colors'
        },
        {
          updatePrompt: 'Update title to "Sales Overview"',
          newTitle: 'Sales Overview',
          description: 'Changes chart title'
        },
        {
          updatePrompt: 'Hide the legend',
          description: 'Removes chart legend'
        }
      ]
    });

  } catch (error) {
    console.error('Widget info API error:', error);
    return Response.json(
      { error: 'Failed to get widget information' },
      { status: 500 }
    );
  }
}