# Video Presentation Feature Setup Guide

This guide explains how to set up and configure the video presentation generation feature.

## Prerequisites

1. **ElevenLabs API Key**: Sign up at [elevenlabs.io](https://elevenlabs.io) and get your API key
2. **Supabase Storage Bucket**: Create a storage bucket named `presentations`
3. **System Dependencies**: Ensure `ffmpeg` is installed on your system

## Environment Variables

Add the following to your `.env.local` file:

```bash
# ElevenLabs API Key for voice generation
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Optional: Default voice ID (defaults to Rachel if not set)
# Get available voices: curl https://api.elevenlabs.io/v1/voices -H "xi-api-key: YOUR_API_KEY"
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Common Voice IDs:**
- `21m00Tcm4TlvDq8ikWAM` - Rachel (female, professional) - **Default**
- `pNInz6obpgDQGcFmaJgB` - Adam (male, professional)
- `EXAVITQu4vr4xnSDxMaL` - Bella (female, clear)

To get all available voices, use:
```bash
curl https://api.elevenlabs.io/v1/voices -H "xi-api-key: YOUR_API_KEY"
```

## Database Setup

Run the migration to create the necessary tables:

```bash
# The migration file is located at:
# supabase/migrations/002_create_presentation_jobs.sql

# If using Supabase CLI:
supabase migration up

# Or apply manually in Supabase Dashboard SQL Editor
```

## Supabase Storage Setup

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New Bucket**
4. Name: `presentations`
5. Set as **Public bucket** (or configure RLS policies as needed)
6. Click **Create**

### Storage Policies (Optional but Recommended)

If you want to restrict access, add RLS policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload presentations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'presentations');

-- Allow users to read their own presentations
CREATE POLICY "Users can read their presentations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'presentations');
```

## System Dependencies

### FFmpeg Installation

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use Chocolatey:
```bash
choco install ffmpeg
```

**Docker:**
If running in Docker, add to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

## Testing

1. Create a dashboard with at least one chart
2. Click the "Generate Video Presentation" button in the dashboard header
3. Monitor the progress bar
4. Once complete, download or preview the video

## Troubleshooting

### "No charts found in dashboard widgets"
- Ensure widgets with `highchartsConfig` exist in the dashboard's `widgets` JSONB column
- Verify the dashboard has widgets by checking `dashboards.widgets` in the database
- Widgets must have a `highchartsConfig` property to be included in the presentation

### "Failed to upload video"
- Verify the `presentations` bucket exists in Supabase Storage
- Check bucket permissions
- Ensure RLS policies allow uploads

### "FFmpeg error"
- Verify ffmpeg is installed: `ffmpeg -version`
- Check that ffmpeg is in your system PATH
- For Docker deployments, ensure ffmpeg is installed in the container

### "ElevenLabs API error" or "voice_not_found"
- Verify your API key is correct
- Check your ElevenLabs account has sufficient credits
- Ensure the API key has text-to-speech permissions
- **If you see "voice_not_found"**: The default voice ID may not be valid. Set `ELEVENLABS_DEFAULT_VOICE_ID` in your `.env.local` file with a valid voice ID (see Environment Variables section)
- To get available voices: `curl https://api.elevenlabs.io/v1/voices -H "xi-api-key: YOUR_API_KEY"`

### Video generation takes too long
- This is normal for dashboards with many charts
- Each chart requires: narration generation, audio synthesis, image rendering, and video composition
- Typical time: 1-2 minutes per chart

## Architecture

The feature uses a job-based architecture:

1. **Job Creation**: User clicks button → API creates job record → Returns jobId immediately
2. **Background Processing**: 
   - Fetch charts from database
   - Generate narration text (AI)
   - Generate audio (ElevenLabs)
   - Render charts as images (Puppeteer)
   - Compose video (ffmpeg)
   - Upload to Supabase Storage
3. **Status Polling**: Frontend polls `/api/presentation/status/[jobId]` every 2 seconds
4. **Completion**: Video URL returned, user can download/preview

## File Structure

```
lib/services/
  └── presentation-processor.ts    # Core processing logic

app/api/presentation/
  ├── generate/route.ts             # Job creation endpoint
  └── status/[jobId]/route.ts       # Status polling endpoint

components/
  └── generate-video-button.tsx     # Frontend component

supabase/migrations/
  └── 002_create_presentation_jobs.sql  # Database schema
```

## Performance Considerations

- **Parallel Processing**: Consider processing multiple charts concurrently
- **Caching**: Chart images could be cached if charts haven't changed
- **Video Compression**: Adjust ffmpeg settings for smaller file sizes
- **Storage Cleanup**: Implement cleanup job for old presentations

## Cost Considerations

- **ElevenLabs**: Charges per character of text converted to speech
- **Supabase Storage**: Charges for storage and bandwidth
- **Compute**: Video generation is CPU-intensive

## Future Enhancements

- [ ] Support for custom voice selection
- [ ] Video quality/format options
- [ ] Background music
- [ ] Slide transitions
- [ ] Export to PowerPoint format
- [ ] Batch processing for multiple dashboards

