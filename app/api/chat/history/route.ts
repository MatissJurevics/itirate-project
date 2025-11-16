import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dashboardId = searchParams.get('dashboardId')

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Missing dashboardId parameter' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chats')
      .select('id, message_role, message_content, created_at')
      .eq('dashboard_id', dashboardId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching chat history:', error)
      return NextResponse.json(
        { error: `Failed to fetch chat history: ${error.message}` },
        { status: 500 }
      )
    }

    // Transform to frontend format
    const messages = data.map((msg: any) => ({
      id: msg.id,
      role: msg.message_role,
      content: msg.message_content,
      timestamp: msg.created_at
    }))

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Chat history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
