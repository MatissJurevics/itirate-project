import { pool } from '@/lib/postgres-client';

export async function DELETE(
  req: Request,
  { params }: { params: { dashboardId: string; widgetId: string } }
) {
  try {
    const { dashboardId, widgetId } = await params;

    if (!dashboardId || !widgetId) {
      return Response.json(
        { error: 'Dashboard ID and Widget ID are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Get current dashboard
      const dashboardResult = await client.query(`
        SELECT widgets FROM dashboards WHERE id = $1
      `, [dashboardId]);

      if (dashboardResult.rows.length === 0) {
        return Response.json(
          { error: `Dashboard with ID ${dashboardId} not found` },
          { status: 404 }
        );
      }

      // Get existing widgets
      const existingWidgets = dashboardResult.rows[0].widgets || [];
      
      console.log(`🔍 Looking for widget ID: ${widgetId}`);
      console.log(`📊 Available widget IDs:`, existingWidgets.map((w: any) => w.id));
      
      // Find widget index
      const widgetIndex = existingWidgets.findIndex((widget: any) => widget.id === widgetId);
      
      if (widgetIndex === -1) {
        return Response.json(
          { 
            error: `Widget with ID ${widgetId} not found in dashboard`,
            availableWidgets: existingWidgets.map((w: any) => w.id),
            searchedFor: widgetId
          },
          { status: 404 }
        );
      }

      // Remove the widget
      const updatedWidgets = existingWidgets.filter((widget: any) => widget.id !== widgetId);

      // Update the dashboard
      const updateResult = await client.query(`
        UPDATE dashboards 
        SET widgets = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `, [JSON.stringify(updatedWidgets), dashboardId]);

      if (updateResult.rows.length === 0) {
        return Response.json(
          { error: 'Failed to update dashboard' },
          { status: 500 }
        );
      }

      console.log(`✅ Widget ${widgetId} deleted from dashboard ${dashboardId}`);
      console.log(`📊 Remaining widgets: ${updatedWidgets.length}`);

      return Response.json({
        success: true,
        message: `Widget ${widgetId} deleted successfully`,
        dashboardId,
        deletedWidgetId: widgetId,
        remainingWidgets: updatedWidgets.length
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Widget deletion error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}