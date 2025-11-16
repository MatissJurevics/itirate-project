import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch datasets for a specific dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('dashboards')
      .select('datasets')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch datasets: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      datasets: data?.datasets || []
    })

  } catch (error) {
    console.error('Error fetching dashboard datasets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Add a dataset to a dashboard
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tableName, fileName, rowCount } = await request.json()
    const supabase = await createClient()
    const { id } = await params

    if (!tableName) {
      return NextResponse.json(
        { error: 'Missing tableName' },
        { status: 400 }
      )
    }

    // Fetch current datasets
    const { data: dashboard, error: fetchError } = await supabase
      .from('dashboards')
      .select('datasets')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch dashboard: ${fetchError.message}` },
        { status: 500 }
      )
    }

    const currentDatasets = dashboard?.datasets || []

    // Check if dataset already exists
    if (currentDatasets.some((d: any) => d.tableName === tableName)) {
      return NextResponse.json(
        { error: 'Dataset already added to this dashboard' },
        { status: 400 }
      )
    }

    // Add new dataset
    const newDataset = {
      tableName,
      fileName: fileName || tableName,
      rowCount: rowCount || 0,
      addedAt: new Date().toISOString()
    }

    const updatedDatasets = [...currentDatasets, newDataset]

    // Update dashboard
    const { error: updateError } = await supabase
      .from('dashboards')
      .update({ datasets: updatedDatasets })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update dashboard: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      datasets: updatedDatasets
    })

  } catch (error) {
    console.error('Error adding dataset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a dataset from a dashboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('tableName')
    const supabase = await createClient()
    const { id } = await params

    if (!tableName) {
      return NextResponse.json(
        { error: 'Missing tableName parameter' },
        { status: 400 }
      )
    }

    // Fetch current datasets
    const { data: dashboard, error: fetchError } = await supabase
      .from('dashboards')
      .select('datasets')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch dashboard: ${fetchError.message}` },
        { status: 500 }
      )
    }

    const currentDatasets = dashboard?.datasets || []

    // Remove the dataset
    const updatedDatasets = currentDatasets.filter(
      (d: any) => d.tableName !== tableName
    )

    // Update dashboard
    const { error: updateError } = await supabase
      .from('dashboards')
      .update({ datasets: updatedDatasets })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update dashboard: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      datasets: updatedDatasets
    })

  } catch (error) {
    console.error('Error removing dataset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
