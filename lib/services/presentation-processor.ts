import { createClient } from '@/lib/supabase/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, readFile, mkdir, readdir, unlink, rmdir } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface PresentationSegment {
  widgetId: string;
  widgetData: any;
  narrationText: string;
  audioPath: string;
  imagePath: string;
  duration: number;
}

/**
 * Main function to process a presentation job
 */
export async function processPresentationJob(
  jobId: string,
  dashboardId: string,
  voiceId: string = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
): Promise<void> {
  const supabase = await createClient();
  const workDir = join(tmpdir(), `presentation-${jobId}`);
  
  // Validate ElevenLabs API key early
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenlabsApiKey) {
    throw new Error(
      'ELEVENLABS_API_KEY environment variable is not set. ' +
      'Please add it to your .env.local file. See PRESENTATION_SETUP.md for instructions.'
    );
  }
  
  try {
    await updateJobStatus(supabase, jobId, 'processing', 0, 'fetching_widgets');
    
    // Stage 1: Fetch dashboard and extract widgets
    const { data: dashboard, error: dashboardError } = await supabase
      .from('dashboards')
      .select('widgets')
      .eq('id', dashboardId)
      .single();
    
    if (dashboardError || !dashboard) {
      throw new Error(`Dashboard not found: ${dashboardError?.message || 'Unknown error'}`);
    }
    
    const widgets = dashboard.widgets || [];
    
    // Filter widgets that have highchartsConfig (charts)
    const chartWidgets = widgets.filter((widget: any) => 
      widget && widget.highchartsConfig
    );
    
    if (chartWidgets.length === 0) {
      throw new Error('No charts found in dashboard widgets');
    }
    
    await mkdir(workDir, { recursive: true });
    const elevenlabs = new ElevenLabsClient({
      apiKey: elevenlabsApiKey,
    });
    
    const segments: PresentationSegment[] = [];
    
    // Stage 2: Generate narration and audio for each widget/chart
    for (let i = 0; i < chartWidgets.length; i++) {
      const widget = chartWidgets[i];
      const progress = Math.floor((i / chartWidgets.length) * 60); // 0-60% for narration/rendering
      
      await updateJobStatus(
        supabase,
        jobId,
        'processing',
        progress,
        `processing_widget_${i + 1}_of_${chartWidgets.length}`
      );
      
      // Generate narration text
      const narrationText = await generateNarrationText(widget);
      
      // Generate audio
      const audioPath = join(workDir, `audio-${i}.mp3`);
      await generateAudio(elevenlabs, voiceId, narrationText, audioPath);
      
      // Render chart as image
      const imagePath = join(workDir, `slide-${i}.png`);
      console.log(`Rendering chart ${i + 1}/${chartWidgets.length}...`);
      await renderChartToImage(widget.highchartsConfig, imagePath);
      console.log(`Chart ${i + 1} rendered successfully`);
      
      // Get audio duration
      const duration = await getAudioDuration(audioPath);
      
      segments.push({
        widgetId: widget.id || `widget-${i}`,
        widgetData: widget,
        narrationText,
        audioPath,
        imagePath,
        duration,
      });
      
      // Save segment to database
      await supabase.from('presentation_segments').insert({
        job_id: jobId,
        widget_id: widget.id || `widget-${i}`,
        sequence_order: i,
        narration_text: narrationText,
        audio_duration: duration,
        widget_data: widget,
      });
    }
    
    // Stage 3: Compose video
    await updateJobStatus(supabase, jobId, 'processing', 70, 'composing_video');
    const videoPath = join(workDir, 'presentation.mp4');
    await createVideoWithSync(segments, videoPath);
    
    // Stage 4: Upload to Supabase Storage
    await updateJobStatus(supabase, jobId, 'processing', 90, 'uploading');
    const videoBuffer = await readFile(videoPath);
    const videoFileName = `presentations/${jobId}/presentation.mp4`;
    
    // Try to upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('presentations')
      .upload(videoFileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Provide helpful error message
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        throw new Error(
          'Storage bucket "presentations" not found. Please create it in Supabase Dashboard → Storage → Buckets. ' +
          'See PRESENTATION_SETUP.md for instructions.'
        );
      }
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('presentations')
      .getPublicUrl(videoFileName);
    
    // Get video duration
    const videoDuration = await getVideoDuration(videoPath);
    
    // Update job as completed
    await supabase
      .from('presentation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        video_url: publicUrl,
        video_duration: videoDuration,
        slide_count: segments.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    // Cleanup
    await cleanup(workDir);
    
  } catch (error) {
    await supabase
      .from('presentation_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId);
    
    await cleanup(workDir);
    throw error;
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  progress: number,
  currentStage: string
): Promise<void> {
  await supabase
    .from('presentation_jobs')
    .update({
      status,
      progress,
      current_stage: currentStage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

/**
 * Generate narration text using AI
 */
async function generateNarrationText(widget: any): Promise<string> {
  const chartType = widget.type || widget.chartType || 'chart';
  const title = widget.title || 'Data visualization';
  const userPrompt = widget.metadata?.userPrompt || widget.userPrompt || '';
  const sqlQuery = widget.metadata?.sqlQuery || widget.sqlQuery || '';
  
  // Extract actual chart data from highchartsConfig
  const highchartsConfig = widget.highchartsConfig || {};
  const series = highchartsConfig.series || [];
  const xAxis = highchartsConfig.xAxis || {};
  const categories = Array.isArray(xAxis) ? xAxis[0]?.categories : xAxis.categories;
  
  // Analyze the actual data
  let dataSummary = '';
  
  if (series.length > 0) {
    const seriesSummaries: string[] = [];
    
    series.forEach((s: any, idx: number) => {
      const seriesName = s.name || `Series ${idx + 1}`;
      const data = s.data || [];
      
      if (data.length > 0) {
        // Extract numeric values from various data formats
        const values = data.map((d: any) => {
          if (typeof d === 'number') return d;
          if (Array.isArray(d) && d.length > 1) return d[1]; // [x, y] format
          if (typeof d === 'object' && d.y !== undefined) return d.y;
          if (typeof d === 'object' && d.value !== undefined) return d.value;
          return null;
        }).filter((v: any) => v !== null && !isNaN(v));
        
        if (values.length > 0) {
          const max = Math.max(...values);
          const min = Math.min(...values);
          const sum = values.reduce((a: number, b: number) => a + b, 0);
          const avg = sum / values.length;
          
          // Get top values with labels if categories exist
          const topValues = values
            .map((val: number, i: number) => ({
              value: val,
              label: categories?.[i] || `Item ${i + 1}`,
            }))
            .sort((a: any, b: any) => b.value - a.value)
            .slice(0, 3);
          
          let summary = `${seriesName}: ${values.length} data points, range ${min.toFixed(1)}-${max.toFixed(1)}, average ${avg.toFixed(1)}`;
          
          if (topValues.length > 0 && topValues[0].value > 0) {
            summary += `. Top: ${topValues.map(t => `${t.label} (${t.value.toFixed(1)})`).join(', ')}`;
          }
          
          seriesSummaries.push(summary);
        }
      }
    });
    
    if (seriesSummaries.length > 0) {
      dataSummary = seriesSummaries.join('\n');
    }
  }
  
  // Build prompt with actual data
  const prompt = `Generate a concise, engaging narration script (20-40 seconds) for this chart.

Chart Type: ${chartType}
Title: ${title}
${userPrompt ? `User Prompt: ${userPrompt}` : ''}
${sqlQuery ? `SQL Query: ${sqlQuery}` : ''}

**Actual Chart Data:**
${dataSummary || 'No data available'}

${categories && categories.length > 0 
  ? `Categories (${categories.length} total): ${categories.slice(0, 10).join(', ')}${categories.length > 10 ? '...' : ''}`
  : ''}

Requirements:
- Describe what the chart ACTUALLY shows based on the data above
- Mention specific values, trends, or comparisons visible in the chart
- Reference actual numbers from the data when relevant
- 30-60 words maximum
- Professional, conversational tone
- Highlight key insights from the actual data
- Suitable for presentation voiceover
- No markdown formatting

Return only the narration text.`;

  const { text } = await generateText({
    model: anthropic('claude-3-haiku-20240307'), // Use cheaper model for narration
    prompt,
  });
  
  return text.trim();
}

/**
 * Generate audio using ElevenLabs
 */
async function generateAudio(
  client: ElevenLabsClient,
  voiceId: string,
  text: string,
  outputPath: string
): Promise<void> {
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  });
  
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  
  await writeFile(outputPath, Buffer.concat(chunks));
}

/**
 * Render chart as image using Puppeteer
 */
async function renderChartToImage(
  chartOptions: any,
  outputPath: string
): Promise<void> {
  // Validate chart options first
  if (!chartOptions) {
    throw new Error('Chart options are missing or null');
  }
  
  if (!chartOptions.chart && !chartOptions.series) {
    throw new Error('Chart options missing required chart or series configuration');
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  
  let browserClosed = false;
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Clean chart config - remove any functions or circular refs
    const cleanConfig = JSON.parse(JSON.stringify(chartOptions));
    
    // Ensure chart has explicit dimensions
    const chartConfigWithDimensions = {
      ...cleanConfig,
      chart: {
        ...cleanConfig.chart,
        width: 1880,
        height: 1040,
      },
    };
    
    // Load Highcharts from bundled node_modules instead of CDN
    const highchartsPath = join(process.cwd(), 'node_modules', 'highcharts', 'highcharts.js');
    let highchartsCode: string;
    
    if (existsSync(highchartsPath)) {
      console.log('Loading Highcharts from bundled node_modules...');
      highchartsCode = readFileSync(highchartsPath, 'utf-8');
    } else {
      // Fallback: try to find it in a different location
      const altPath = join(process.cwd(), 'node_modules', '@highcharts', 'highcharts', 'highcharts.js');
      if (existsSync(altPath)) {
        console.log('Loading Highcharts from alternative path...');
        highchartsCode = readFileSync(altPath, 'utf-8');
      } else {
        throw new Error(
          `Highcharts bundle not found. Expected at ${highchartsPath} or ${altPath}. ` +
          'Please ensure highcharts is installed: npm install highcharts'
        );
      }
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              margin: 0; 
              padding: 20px; 
              background: white; 
              width: 1920px;
              height: 1080px;
              overflow: hidden;
            }
            #chart { 
              width: 1880px; 
              height: 1040px; 
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div id="chart"></div>
          <script>
            ${highchartsCode}
          </script>
          <script>
            (function() {
              let chartRendered = false;
              
              function renderChart() {
                if (chartRendered) return;
                
                if (typeof Highcharts === 'undefined') {
                  console.error('Highcharts is undefined after loading');
                  window.chartError = 'Highcharts failed to initialize';
                  return;
                }
                
                try {
                  const config = ${JSON.stringify(chartConfigWithDimensions)};
                  Highcharts.chart('chart', config);
                  chartRendered = true;
                  window.chartReady = true;
                  console.log('Chart rendered successfully');
                } catch (error) {
                  console.error('Chart error:', error);
                  window.chartError = error.message || String(error);
                }
              }
              
              // Wait a moment for Highcharts to initialize
              setTimeout(() => {
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', renderChart);
                } else {
                  renderChart();
                }
              }, 100);
            })();
          </script>
        </body>
      </html>
    `;
    
    console.log('Setting page content...');
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    console.log('Waiting for Highcharts to initialize...');
    // Wait for Highcharts to be available (should be immediate since it's bundled)
    let highchartsLoaded = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      highchartsLoaded = await page.evaluate(() => typeof window.Highcharts !== 'undefined');
      if (highchartsLoaded) {
        console.log('Highcharts initialized successfully');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!highchartsLoaded) {
      throw new Error('Highcharts failed to initialize from bundled code');
    }
    
    console.log('Waiting for chart render...');
    // Wait for chart with simpler logic
    let chartReady = false;
    for (let i = 0; i < 40; i++) { // 20 seconds max
      const state = await page.evaluate(() => {
        const svg = document.querySelector('#chart svg');
        return {
          ready: !!(window as any).chartReady,
          error: (window as any).chartError,
          hasSvg: !!svg && svg.children.length > 0,
        };
      });
      
      if (state.error) {
        throw new Error(`Chart error: ${state.error}`);
      }
      
      if (state.ready && state.hasSvg) {
        chartReady = true;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!chartReady) {
      console.warn('Chart may not be fully rendered, proceeding anyway...');
    }
    
    // Final wait
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Taking screenshot...');
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: 1920, height: 1080 },
    });
    
  } catch (error) {
    console.error('Error rendering chart:', error);
    throw error;
  } finally {
    if (!browserClosed) {
      await browser.close().catch(err => console.error('Error closing browser:', err));
      browserClosed = true;
    }
  }
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(Math.floor(metadata.format.duration || 0));
    });
  });
}

/**
 * Create video with synchronized slides and audio
 */
async function createVideoWithSync(
  segments: Array<{ imagePath: string; audioPath: string; duration: number }>,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg();
    
    // Add all inputs
    segments.forEach((segment) => {
      command = command
        .input(segment.imagePath)
        .inputOptions([
          `-loop 1`,
          `-t ${segment.duration}`,
          `-framerate 1`,
        ])
        .input(segment.audioPath);
    });
    
    // Build filter complex for synchronization
    const videoFilters: string[] = [];
    const audioFilters: string[] = [];
    const concatInputs: string[] = [];
    
    segments.forEach((_, index) => {
      const imageIndex = index * 2;
      const audioIndex = index * 2 + 1;
      
      videoFilters.push(
        `[${imageIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS[v${index}]`
      );
      audioFilters.push(`[${audioIndex}:a]asetpts=PTS-STARTPTS[a${index}]`);
      concatInputs.push(`[v${index}][a${index}]`);
    });
    
    const filterComplex = [
      ...videoFilters,
      ...audioFilters,
      `${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[outv][outa]`,
    ].join(';');
    
    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map [outv]',
        '-map [outa]',
        '-c:v libx264',
        '-c:a aac',
        '-pix_fmt yuv420p',
        '-shortest',
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .on('progress', (progress) => {
        console.log('Video processing:', progress.percent);
      })
      .run();
  });
}

/**
 * Cleanup temporary files
 */
async function cleanup(dir: string): Promise<void> {
  try {
    const files = await readdir(dir);
    await Promise.all(files.map(file => unlink(join(dir, file))));
    await rmdir(dir);
  } catch (error) {
    console.error('Cleanup error:', error);
    // Don't throw - cleanup errors shouldn't fail the job
  }
}

