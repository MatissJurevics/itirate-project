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
      .from('charts')
      .select('id, chart_options, chart_type, sql_query, user_prompt, created_at')
      .eq('dashboard_id', dashboardId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching charts:', error)
      return NextResponse.json(
        { error: `Failed to fetch charts: ${error.message}` },
        { status: 500 }
      )
    }

    // Transform to widget format for the dashboard
    const widgets = data.map((chart: any) => ({
      id: chart.id,
      chartId: chart.id,
      highchartsConfig: chart.chart_options,
      chartType: chart.chart_type,
      sqlQuery: chart.sql_query,
      userPrompt: chart.user_prompt,
      createdAt: chart.created_at
    }))

    return NextResponse.json({
      success: true,
      charts: widgets
    })

  } catch (error) {
    console.error('Dashboard charts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
