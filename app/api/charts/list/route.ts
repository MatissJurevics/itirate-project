import { pool } from '@/lib/postgres-client';

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, csv_id, chart_options, sql_query, chart_type, user_prompt, created_at, updated_at
        FROM charts
        ORDER BY created_at DESC
        LIMIT 10;
      `);

      return Response.json({
        success: true,
        charts: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching charts:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}