import { z } from 'zod';
import { tool } from 'ai';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { DashboardAnalysis, WidgetInsight } from '../services/dashboard-analyzer';

const generateVoiceSummarySchema = z.object({
  dashboardAnalysis: z.object({
    title: z.string(),
    totalWidgets: z.number(),
    insights: z.array(z.object({
      id: z.string(),
      title: z.string(),
      type: z.string(),
      insights: z.array(z.string()),
      keyMetrics: z.array(z.string()),
      dataContext: z.string(),
    })),
    overallThemes: z.array(z.string()),
    datasetContext: z.object({
      fileName: z.string().optional(),
      rowCount: z.number().optional(),
      tableName: z.string().optional(),
    }).optional(),
  }),
  maxDurationMinutes: z.number().optional().default(3).describe('Maximum duration for the audio summary in minutes'),
  voiceStyle: z.enum(['professional', 'conversational', 'analytical']).optional().default('professional').describe('Style of voice narration'),
});

export interface VoiceSummaryResult {
  script: string;
  transcript: string;
  estimatedDuration: number; // in seconds
  keyHighlights: string[];
}

export const generateVoiceSummary = tool({
  description: 'Generate a voice-optimized summary script from dashboard analysis data',
  inputSchema: generateVoiceSummarySchema,
  execute: async ({ dashboardAnalysis, maxDurationMinutes, voiceStyle }) => {
    try {
      console.log(`🎙️ Generating voice summary for dashboard: ${dashboardAnalysis.title}`);
      console.log(`📊 Analyzing ${dashboardAnalysis.totalWidgets} widgets`);
      console.log(`⏱️ Target duration: ${maxDurationMinutes} minutes`);

      const targetWords = maxDurationMinutes * 150; // ~150 words per minute for clear speech
      
      const systemPrompt = `You are an expert data storyteller. Create engaging, direct audio summaries that get straight to the insights.

Voice Style Guidelines:
- Professional: Clear, authoritative conclusions
- Conversational: Natural, approachable language
- Analytical: Technical with specific metrics

Key Requirements:
1. GET STRAIGHT TO THE INSIGHTS - no lengthy introductions
2. Focus on what the data shows, not what you're doing
3. Include specific numbers and key findings
4. Target approximately ${targetWords} words for ${maxDurationMinutes} minute(s)
5. Use natural speech patterns
6. Include brief pauses indicated with [pause] where appropriate

Structure:
1. Jump directly into key findings (skip lengthy intros)
2. Present main insights from most important widgets
3. Highlight notable trends and patterns
4. End with actionable conclusions

Avoid:
- "Let me analyze..." or "I'm going to examine..."
- "This dashboard shows..." - just state what it shows
- Long contextual setup - get to the data insights quickly
- Meta-commentary about your analysis process`;

      const prompt = `Create a ${voiceStyle} voice summary for: ${dashboardAnalysis.title}

Key Findings:
${dashboardAnalysis.insights.map((insight, index) => `
${insight.title}: ${insight.keyMetrics.join(' • ')} | ${insight.insights.join(' • ')}
`).join('')}

Overall themes: ${dashboardAnalysis.overallThemes.join(', ')}

Requirements:
- Start with the most important finding immediately
- ${targetWords} words (${maxDurationMinutes} minutes)
- ${voiceStyle} tone
- No meta-commentary or process descriptions
- Focus on actionable insights and key numbers
- Include [pause] markers for natural flow

Create a direct, insight-focused summary that gets straight to what the data reveals.`;

      const result = await generateText({
        model: anthropic('claude-3-haiku-20240307'),
        system: systemPrompt,
        prompt,
      });

      const script = result.text;
      
      // Clean up script for TTS and create transcript
      const cleanScript = script
        .replace(/\[pause\]/g, '') // Remove pause markers for TTS
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .trim();

      const transcript = script; // Keep original with pause markers for display

      // Estimate duration (average speaking rate: 150-160 words per minute)
      const wordCount = cleanScript.split(/\s+/).length;
      const estimatedDuration = Math.round((wordCount / 150) * 60); // in seconds

      // Extract key highlights from the summary
      const keyHighlights = extractKeyHighlights(script, dashboardAnalysis);

      console.log(`✅ Generated voice summary:`);
      console.log(`   📝 Word count: ${wordCount}`);
      console.log(`   ⏱️ Estimated duration: ${Math.round(estimatedDuration / 60 * 10) / 10} minutes`);
      console.log(`   🎯 Key highlights: ${keyHighlights.length}`);

      return {
        script: cleanScript,
        transcript,
        estimatedDuration,
        keyHighlights,
      };

    } catch (error) {
      console.error('Voice summary generation error:', error);
      throw new Error(`Failed to generate voice summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

function extractKeyHighlights(script: string, analysis: DashboardAnalysis): string[] {
  const highlights: string[] = [];
  
  try {
    // Extract highlights from dashboard themes
    analysis.overallThemes.forEach(theme => {
      highlights.push(theme);
    });

    // Extract significant metrics from widgets
    analysis.insights.forEach(insight => {
      // Look for the first key metric that contains numbers
      const significantMetric = insight.keyMetrics.find(metric => 
        /\d+/.test(metric) && metric.length < 100
      );
      if (significantMetric) {
        highlights.push(`${insight.title}: ${significantMetric}`);
      }
    });

    // Extract key phrases from script
    const sentences = script.split(/[.!?]+/).filter(s => s.trim());
    const keyPhrases = sentences
      .filter(sentence => 
        sentence.toLowerCase().includes('key') ||
        sentence.toLowerCase().includes('significant') ||
        sentence.toLowerCase().includes('important') ||
        sentence.toLowerCase().includes('notable') ||
        sentence.toLowerCase().includes('highest') ||
        sentence.toLowerCase().includes('lowest')
      )
      .map(sentence => sentence.trim())
      .slice(0, 3); // Take first 3 key phrases

    highlights.push(...keyPhrases);

    // Limit to most important highlights
    return highlights.slice(0, 5);

  } catch (error) {
    console.error('Error extracting highlights:', error);
    return [`Dashboard analysis with ${analysis.totalWidgets} visualizations`];
  }
}

// Standalone function for direct usage
export async function generateDashboardVoiceSummary(
  analysis: DashboardAnalysis,
  options: {
    maxDurationMinutes?: number;
    voiceStyle?: 'professional' | 'conversational' | 'analytical';
  } = {}
): Promise<VoiceSummaryResult> {
  const result = await generateVoiceSummary.execute({
    dashboardAnalysis: analysis,
    maxDurationMinutes: options.maxDurationMinutes || 3,
    voiceStyle: options.voiceStyle || 'professional',
  }, {
    toolCallId: 'direct-call',
    messages: [],
    abortSignal: undefined,
  });

  return result as VoiceSummaryResult;
}