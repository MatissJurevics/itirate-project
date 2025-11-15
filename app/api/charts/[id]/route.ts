import { pool } from '@/lib/postgres-client';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return Response.json(
        { error: 'Chart ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, csv_id, chart_options, sql_query, chart_type, user_prompt, created_at, updated_at
        FROM charts
        WHERE id = $1;
      `, [id]);

      if (result.rows.length === 0) {
        return Response.json(
          { error: 'Chart not found' },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        chart: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching chart:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}