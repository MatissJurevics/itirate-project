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
    const { tableName, rows, columns } = await request.json()

    if (!tableName || !rows || !columns) {
      return NextResponse.json(
        { error: 'Missing tableName, rows, or columns' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Sanitize the data and convert null-like values
    const insertData = rows.map((record: Record<string, any>) => {
      const sanitizedRecord: Record<string, any> = {}
      columns.forEach((key: string) => {
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
        let value = record[key]

        // Convert common null placeholders to actual null
        if (
          value === 'None' ||
          value === 'null' ||
          value === 'NULL' ||
          value === 'N/A' ||
          value === 'NA' ||
          value === 'n/a' ||
          value === '' ||
          value === '.' ||
          value === '-' ||
          value === '--' ||
          value === 'undefined'
        ) {
          value = null
        }

        sanitizedRecord[sanitizedKey] = value
      })
      return sanitizedRecord
    })

    // Insert with retry for schema cache issues
    const maxRetries = 5
    const retryDelayMs = 500

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { error: insertError } = await supabase
        .schema('csv_to_table')
        .from(tableName)
        .insert(insertData)

      if (!insertError) {
        return NextResponse.json({
          success: true,
          inserted: rows.length
        })
      }

      const isSchemaCacheError = insertError.message?.includes('schema cache')
      if (!isSchemaCacheError || attempt === maxRetries - 1) {
        console.error('Error inserting data:', insertError)
        return NextResponse.json(
          { error: `Failed to insert data: ${formatSupabaseError(insertError)}` },
          { status: 500 }
        )
      }

      await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)))
    }

  } catch (error) {
    console.error('Insert error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
