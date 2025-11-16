import { NextResponse } from 'next/server'
import postgres from 'postgres'

export async function GET() {
  let sql: postgres.Sql | null = null

  try {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL environment variable is missing' },
        { status: 500 }
      )
    }

    // Create postgres client
    sql = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })

    // Query pg_tables to get all tables in csv_to_table schema
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'csv_to_table'
      ORDER BY tablename DESC
    `

    // Get row counts for each table using a single query with UNION ALL
    // This is more efficient than multiple separate queries
    let datasetCounts: Record<string, number> = {}
    
    if (tables.length > 0) {
      try {
        const countQueries = tables.map((table: any) => 
          `SELECT '${table.tablename}' as tablename, COUNT(*) as count FROM csv_to_table."${table.tablename}"`
        ).join(' UNION ALL ')
        
        const counts = await sql.unsafe(countQueries)
        datasetCounts = counts.reduce((acc: any, row: any) => {
          acc[row.tablename] = parseInt(row.count)
          return acc
        }, {})
      } catch (err) {
        console.error('Error getting row counts:', err)
      }
    }

    const datasets = tables.map((table: any) => ({
      tableName: table.tablename,
      fileName: table.tablename.replace(/^csv_/, '').replace(/_/g, ' '), // Basic cleanup
      rowCount: datasetCounts[table.tablename] || 0,
    }))

    return NextResponse.json({
      success: true,
      datasets
    })

  } catch (error) {
    console.error('Dataset list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    // Clean up connection
    if (sql) {
      await sql.end()
    }
  }
}
