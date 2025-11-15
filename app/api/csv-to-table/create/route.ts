import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const formatSupabaseError = (error: any) => {
  if (!error) return 'Unknown Supabase error'
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.details) return error.details
  if (error.hint) return error.hint
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tableName, columns, sampleData } = await request.json()

    if (!tableName || !columns || !sampleData) {
      return NextResponse.json(
        { error: 'Missing tableName, columns, or sampleData' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Infer column types based on sample data
    const columnDefinitions = columns.map((col: string) => {
      const sanitizedCol = col.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()

      // Check first non-null value to infer type
      const sampleValue = sampleData.find((r: any) => r[col] != null)?.[col]
      let type = 'text' // default to text

      if (sampleValue) {
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

    // Call the create_csv_table RPC function
    const { error: createError } = await supabase
      .schema('public')
      .rpc('create_csv_table', {
        table_sql: createTableSQL
      })

    if (createError) {
      console.error('Error creating table:', createError)
      return NextResponse.json(
        { error: `Failed to create table: ${formatSupabaseError(createError)}` },
        { status: 500 }
      )
    }

    const sanitizedColumns = columns.map((col: string) =>
      col.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    )

    return NextResponse.json({
      success: true,
      tableName,
      columns: sanitizedColumns
    })

  } catch (error) {
    console.error('Create table error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
