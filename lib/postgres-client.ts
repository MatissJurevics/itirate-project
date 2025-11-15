import { Pool } from 'pg';

// Create a connection pool for PostgreSQL with improved timeout settings
const pool = new Pool({
  connectionString: 'postgresql://postgres.ugxjiapxufjtcqxanrju:Iterate-Hackathon@aws-1-eu-north-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 15000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

export { pool };

export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return { success: true, time: result.rows[0].now };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}