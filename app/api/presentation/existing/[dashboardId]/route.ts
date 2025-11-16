import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    
    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Missing dashboardId parameter' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Find the most recent completed job for this dashboard
    const { data: job, error } = await supabase
      .from('presentation_jobs')
      .select('id, video_url, video_duration, slide_count, completed_at')
      .eq('dashboard_id', dashboardId)
      .eq('status', 'completed')
      .not('video_url', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing video:', error);
      return NextResponse.json(
        { error: 'Failed to check for existing video' },
        { status: 500 }
      );
    }
    
    if (!job) {
      return NextResponse.json({
        exists: false,
      });
    }
    
    return NextResponse.json({
      exists: true,
      jobId: job.id,
      videoUrl: job.video_url,
      videoDuration: job.video_duration,
      slideCount: job.slide_count,
      completedAt: job.completed_at,
    });
  } catch (error) {
    console.error('Existing video check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

