import { pool } from '@/lib/postgres-client';
import { DashboardAnalyzer } from '@/lib/services/dashboard-analyzer';
import { generateDashboardVoiceSummary } from '@/lib/ai/summary-generation-tool';
import { VoiceService } from '@/lib/services/voice-service';

interface RequestBody {
  maxDurationMinutes?: number;
  voiceStyle?: 'professional' | 'conversational' | 'analytical';
  regenerate?: boolean; // Force regeneration even if audio exists
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    const body: RequestBody = await req.json();
    
    const {
      maxDurationMinutes = 3,
      voiceStyle = 'professional',
      regenerate = false
    } = body;

    console.log(`🎙️ === DASHBOARD VOICE GENERATION ===`);
    console.log(`📊 Dashboard ID: ${dashboardId}`);
    console.log(`⏱️ Max Duration: ${maxDurationMinutes} minutes`);
    console.log(`🎭 Voice Style: ${voiceStyle}`);
    console.log(`🔄 Regenerate: ${regenerate}`);

    // Get dashboard data
    const client = await pool.connect();
    
    try {
      // Fetch dashboard with widgets
      const dashboardResult = await client.query(`
        SELECT 
          id, 
          title, 
          widgets, 
          file_name, 
          row_count, 
          csv_table_name,
          audio,
          transcript,
          created_at,
          updated_at
        FROM dashboards 
        WHERE id = $1
      `, [dashboardId]);

      if (dashboardResult.rows.length === 0) {
        return Response.json(
          { error: `Dashboard with ID ${dashboardId} not found` },
          { status: 404 }
        );
      }

      const dashboard = dashboardResult.rows[0];

      // Check if audio already exists and regeneration is not forced
      if (dashboard.audio && dashboard.transcript && !regenerate) {
        console.log('🎵 Audio already exists, returning cached version');
        return Response.json({
          success: true,
          cached: true,
          audioUrl: dashboard.audio,
          transcript: dashboard.transcript,
          message: 'Voice summary already exists. Use regenerate=true to create new audio.',
        });
      }

      // Validate widgets exist
      const widgets = dashboard.widgets || [];
      if (widgets.length === 0) {
        return Response.json(
          { error: 'Dashboard has no widgets to analyze' },
          { status: 400 }
        );
      }

      console.log(`📊 Found ${widgets.length} widgets to analyze`);

      // Step 1: Analyze dashboard
      console.log('🔍 Step 1: Analyzing dashboard widgets...');
      const analysis = await DashboardAnalyzer.analyzeDashboard({
        id: dashboard.id,
        title: dashboard.title,
        widgets: widgets,
        file_name: dashboard.file_name,
        row_count: dashboard.row_count,
        csv_table_name: dashboard.csv_table_name,
      });

      console.log(`✅ Analysis complete:`);
      console.log(`   - ${analysis.insights.length} widget insights`);
      console.log(`   - ${analysis.overallThemes.length} themes: ${analysis.overallThemes.join(', ')}`);

      // Step 2: Generate voice summary script
      console.log('📝 Step 2: Generating voice summary script...');
      const summaryResult = await generateDashboardVoiceSummary(analysis, {
        maxDurationMinutes,
        voiceStyle,
      });

      console.log(`✅ Script generated:`);
      console.log(`   - ${summaryResult.script.split(' ').length} words`);
      console.log(`   - ~${summaryResult.estimatedDuration} seconds estimated`);
      console.log(`   - ${summaryResult.keyHighlights.length} key highlights`);

      // Step 3: Generate voice audio
      console.log('🎤 Step 3: Converting to speech...');
      const voiceSettings = VoiceService.getVoiceSettings('dashboard');
      const voiceResult = await VoiceService.generateSpeech(summaryResult.script, voiceSettings);

      console.log(`✅ Voice generated:`);
      console.log(`   - Audio size: ${(voiceResult.audioBuffer.length / 1024).toFixed(1)} KB`);
      console.log(`   - Public URL: ${voiceResult.publicUrl}`);
      console.log(`   - Voice: ${voiceResult.voiceId}`);

      // Step 4: Update dashboard with audio and transcript
      console.log('💾 Step 4: Saving audio to dashboard...');
      const updateResult = await client.query(`
        UPDATE dashboards 
        SET 
          audio = $1,
          transcript = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING id, audio, transcript
      `, [voiceResult.publicUrl, summaryResult.transcript, dashboardId]);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update dashboard with audio');
      }

      console.log('✅ Dashboard updated successfully');
      console.log('=====================================');

      // Return success response
      return Response.json({
        success: true,
        cached: false,
        audioUrl: voiceResult.publicUrl,
        transcript: summaryResult.transcript,
        keyHighlights: summaryResult.keyHighlights,
        analysis: {
          totalWidgets: analysis.totalWidgets,
          themes: analysis.overallThemes,
          estimatedDuration: summaryResult.estimatedDuration,
          wordCount: summaryResult.script.split(' ').length,
        },
        voice: {
          voiceId: voiceResult.voiceId,
          modelId: voiceResult.modelId,
          style: voiceStyle,
        },
        message: 'Voice summary generated successfully',
        generatedAt: new Date().toISOString(),
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Voice generation error:', error);

    // Enhanced error handling for different failure types
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Specific error types
      if (error.message.includes('quota') || error.message.includes('limit')) {
        statusCode = 429; // Too Many Requests
      } else if (error.message.includes('authentication') || error.message.includes('API key')) {
        statusCode = 401; // Unauthorized
      } else if (error.message.includes('not found')) {
        statusCode = 404; // Not Found
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        statusCode = 400; // Bad Request
      }
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;

    console.log(`📋 Checking voice status for dashboard: ${dashboardId}`);

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          title,
          audio,
          transcript,
          updated_at
        FROM dashboards 
        WHERE id = $1
      `, [dashboardId]);

      if (result.rows.length === 0) {
        return Response.json(
          { error: `Dashboard with ID ${dashboardId} not found` },
          { status: 404 }
        );
      }

      const dashboard = result.rows[0];
      const hasAudio = !!(dashboard.audio && dashboard.transcript);

      return Response.json({
        dashboardId,
        title: dashboard.title,
        hasAudio,
        audioUrl: dashboard.audio || null,
        lastGenerated: hasAudio ? dashboard.updated_at : null,
        transcript: dashboard.transcript || null,
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Voice status check error:', error);
    return Response.json(
      { error: 'Failed to check voice status' },
      { status: 500 }
    );
  }
}