import { NextRequest, NextResponse } from 'next/server';
import { SQLExecutor } from '@/lib/services/sql-executor';

export const maxDuration = 30;

interface TestSQLRequest {
  csvId: string;
  query: string;
}

/**
 * Test endpoint for SQL executor
 * 
 * POST /api/test-sql
 * 
 * Body:
 * {
 *   "csvId": "1763234493594_w0ydhk",
 *   "query": "SELECT * FROM csv_to_table.csv_1763234493594_w0ydhk LIMIT 5"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body: TestSQLRequest = await req.json();
    const { csvId, query } = body;

    if (!csvId) {
      return NextResponse.json(
        { error: 'Missing csvId parameter' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST SQL ENDPOINT');
    console.log('='.repeat(80));
    console.log('CSV ID:', csvId);
    console.log('Query:', query);

    // Determine table name based on csvId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const tableName = uuidRegex.test(csvId) 
      ? `csv_${csvId.replace(/-/g, '_')}`
      : `csv_${csvId}`;

    console.log('Table Name:', tableName);
    console.log('='.repeat(80));

    // Execute the query
    const result = await SQLExecutor.executeWithCache(
      query,
      tableName,
      csvId
    );

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(80) + '\n');

    // Return the result
    return NextResponse.json({
      success: result.success,
      result,
      debug: {
        csvId,
        tableName,
        query,
      }
    });

  } catch (error) {
    console.error('Test SQL Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to show usage information
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test-sql',
    method: 'POST',
    description: 'Test endpoint for SQL executor',
    usage: {
      csvId: 'The CSV ID (e.g., "1763234493594_w0ydhk" or UUID format)',
      query: 'The SQL query to execute (SELECT only)',
    },
    examples: [
      {
        description: 'Test with timestamp-based ID',
        request: {
          csvId: '1763234493594_w0ydhk',
          query: 'SELECT * FROM csv_to_table.csv_1763234493594_w0ydhk LIMIT 5'
        }
      },
      {
        description: 'Test with UUID',
        request: {
          csvId: 'abc12345-1234-5678-9012-abcdef123456',
          query: 'SELECT COUNT(*) FROM csv_to_table.csv_abc12345_1234_5678_9012_abcdef123456'
        }
      },
      {
        description: 'Test random row',
        request: {
          csvId: '1763234493594_w0ydhk',
          query: 'SELECT * FROM csv_to_table.csv_1763234493594_w0ydhk ORDER BY RANDOM() LIMIT 1'
        }
      }
    ]
  });
}
