import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { csvUrl, fileName } = await request.json()

    if (!csvUrl || !fileName) {
      return NextResponse.json(
        { error: 'Missing csvUrl or fileName' },
        { status: 400 }
      )
    }

    // Fetch the CSV file from the URL
    const response = await fetch(csvUrl)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch CSV file' },
        { status: 400 }
      )
    }

    const csvText = await response.text()

    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, any>[]

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    // Extract column names and infer types from first row
    const columns = Object.keys(records[0])

    // Sanitize table name (remove extension, special chars, use lowercase)
    const tableName = fileName
      .replace(/\.csv$/i, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase()

    const supabase = await createClient()

    // Infer column types based on sample data
    const columnDefinitions = columns.map(col => {
      const sanitizedCol = col.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()

      // Check first non-null value to infer type
      const sampleValue = records.find((r: any) => r[col] != null)?.[col]
      let type = 'text' // default to text

      if (sampleValue) {
        // Try to infer type
        if (!isNaN(Number(sampleValue))) {
          type = sampleValue.includes('.') ? 'numeric' : 'integer'
        } else if (!isNaN(Date.parse(sampleValue))) {
          type = 'timestamp'
        }
      }

      return `${sanitizedCol} ${type}`
    })

    // Build the SQL to create table
    const createTableSQL = `
      CREATE SCHEMA IF NOT EXISTS csv_to_table;

      CREATE TABLE IF NOT EXISTS csv_to_table."${tableName}" (
        internal_database_id SERIAL PRIMARY KEY,
        ${columnDefinitions.join(',\n        ')}
      );
    `

    console.log('Creating table with SQL:', createTableSQL)

    // Call the create_csv_table RPC function in the public schema
    const { error: createError } = await supabase
      .schema('public')
      .rpc('create_csv_table', {
        table_sql: createTableSQL
      })

    if (createError) {
      console.error('Error creating table:', createError)
      return NextResponse.json(
        { error: `Failed to create table: ${createError.message}. Please create the RPC function first.` },
        { status: 500 }
      )
    }

    // Prepare insert data with sanitized column names
    const insertColumns = columns.map(col => col.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())

    const insertData = records.map((record: Record<string, any>) => {
      const sanitizedRecord: Record<string, any> = {}
      Object.keys(record).forEach(key => {
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
        sanitizedRecord[sanitizedKey] = record[key]
      })
      return sanitizedRecord
    })

    // Temporarily retry inserts because PostgREST may need a moment to reload the schema
    const insertBatchWithRetry = async (batch: Record<string, any>[]) => {
      const maxRetries = 5
      const retryDelayMs = 500

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const { error: insertError } = await supabase
          .schema('csv_to_table')
          .from(tableName)
          .insert(batch)

        if (!insertError) {
          return
        }

        const isSchemaCacheError = insertError.message?.includes('schema cache')
        if (!isSchemaCacheError || attempt === maxRetries - 1) {
          console.error('Error inserting data batch:', insertError)
          throw new Error(`Failed to insert data: ${insertError.message}`)
        }

        await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)))
      }
    }

    // Insert data in batches (Supabase has a limit on insert size)
    const batchSize = 100
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize)
      await insertBatchWithRetry(batch)
    }

    return NextResponse.json({
      success: true,
      tableName,
      schema: 'csv_to_table',
      rowCount: records.length,
      columns: insertColumns
    })

  } catch (error) {
    console.error('CSV to table error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
