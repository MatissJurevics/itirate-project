import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPresentationJob } from '@/lib/services/presentation-processor';

export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function POST(req: NextRequest) {
  try {
    const { dashboardId, voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' } = await req.json();
    
    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Missing dashboardId parameter' },
        { status: 400 }
      );
    }
    
    // Validate ElevenLabs API key before creating job
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { 
          error: 'ELEVENLABS_API_KEY environment variable is not set. ' +
                 'Please add it to your .env.local file. See PRESENTATION_SETUP.md for instructions.'
        },
        { status: 500 }
      );
    }
    
    const supabase = await createClient();
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create job record
    const { data: job, error } = await supabase
      .from('presentation_jobs')
      .insert({
        dashboard_id: dashboardId,
        user_id: user?.id,
        status: 'pending',
        progress: 0,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating presentation job:', error);
      return NextResponse.json(
        { error: `Failed to create job: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Start processing asynchronously (don't await)
    processPresentationJob(job.id, dashboardId, voiceId).catch(err => {
      console.error('Background processing error:', err);
      // Update job status to failed
      supabase
        .from('presentation_jobs')
        .update({ 
          status: 'failed', 
          error_message: err instanceof Error ? err.message : 'Unknown error'
        })
        .eq('id', job.id);
    });
    
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: 'Video generation started',
    });
  } catch (error) {
    console.error('Presentation generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

