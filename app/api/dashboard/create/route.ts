import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { title, csvTableName, fileName, rowCount, initialPrompt } = await request.json()

    if (!csvTableName) {
      return NextResponse.json(
        { error: 'Missing csvTableName' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('dashboards')
      .insert({
        title: title || 'New Dashboard',
        widgets: [],
        csv_table_name: csvTableName,
        file_name: fileName || '',
        row_count: rowCount || 0,
        initial_prompt: initialPrompt || '',
        audio: null,
        transcript: null
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating dashboard:', error)
      return NextResponse.json(
        { error: `Failed to create dashboard: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data.id
    })

  } catch (error) {
    console.error('Dashboard creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
