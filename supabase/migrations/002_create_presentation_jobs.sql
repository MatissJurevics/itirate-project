-- Create presentation_jobs table for tracking video generation jobs
CREATE TABLE IF NOT EXISTS presentation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  current_stage TEXT, -- fetching_widgets, narration, rendering, composition, uploading
  error_message TEXT,
  video_url TEXT, -- Supabase storage URL
  video_duration INTEGER, -- seconds
  slide_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create presentation_segments table for storing narration segments
CREATE TABLE IF NOT EXISTS presentation_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES presentation_jobs(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL, -- ID of the widget from dashboards.widgets JSONB array
  sequence_order INTEGER NOT NULL,
  narration_text TEXT NOT NULL,
  audio_url TEXT, -- Supabase storage URL for audio file
  audio_duration REAL, -- seconds
  slide_image_url TEXT, -- Supabase storage URL for slide image
  widget_data JSONB, -- Store widget data snapshot for reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_presentation_jobs_dashboard_id ON presentation_jobs(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_presentation_jobs_status ON presentation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_presentation_jobs_user_id ON presentation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_jobs_created_at ON presentation_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_presentation_segments_job_id ON presentation_segments(job_id);
CREATE INDEX IF NOT EXISTS idx_presentation_segments_widget_id ON presentation_segments(widget_id);
CREATE INDEX IF NOT EXISTS idx_presentation_segments_sequence ON presentation_segments(job_id, sequence_order);

