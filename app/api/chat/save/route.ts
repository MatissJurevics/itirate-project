import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { dashboardId, messageRole, messageContent, metadata } = await request.json()

    if (!dashboardId || !messageRole || !messageContent) {
      return NextResponse.json(
        { error: 'Missing dashboardId, messageRole, or messageContent' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chats')
      .insert({
        dashboard_id: dashboardId,
        message_role: messageRole,
        message_content: messageContent,
        message_metadata: metadata || {}
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error saving chat message:', error)
      return NextResponse.json(
        { error: `Failed to save message: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data.id
    })

  } catch (error) {
    console.error('Chat save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
