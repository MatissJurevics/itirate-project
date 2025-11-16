import { z } from 'zod';
import { tool } from 'ai';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { WidgetAnalyzer, type WidgetAnalysis, type UpdateInterpretation } from '../services/widget-analyzer';

const updateWidgetSchema = z.object({
  currentConfig: z.object({}).passthrough().describe('Current Highcharts configuration'),
  updatePrompt: z.string().describe('User prompt describing desired changes'),
  widgetAnalysis: z.object({
    widgetId: z.string(),
    currentChartType: z.string(),
    title: z.string(),
    dataStructure: z.object({
      hasCategories: z.boolean(),
      hasTimeSeries: z.boolean(),
      hasMultipleSeries: z.boolean(),
      seriesCount: z.number(),
      dataPoints: z.number(),
      dataTypes: z.array(z.string()),
      categories: z.array(z.string()).optional()
    }),
    styling: z.object({
      colors: z.array(z.string()),
      hasLegend: z.boolean(),
      hasTitle: z.boolean(),
      axisLabels: z.object({
        xAxis: z.string().optional(),
        yAxis: z.string().optional()
      })
    }),
    compatibility: z.object({
      canBePieChart: z.boolean(),
      canBeLineChart: z.boolean(),
      canBeBarChart: z.boolean(),
      canBeScatterChart: z.boolean(),
      reasons: z.array(z.string())
    })
  }).passthrough(),
  preserveData: z.boolean().optional().default(true).describe('Whether to preserve existing data'),
});

export interface WidgetUpdateResult {
  success: boolean;
  updatedConfig?: any;
  interpretation?: UpdateInterpretation;
  warnings?: string[];
  errors?: string[];
}

export const updateWidgetConfig = tool({
  description: 'Update a widget configuration based on user prompt while preserving data integrity',
  inputSchema: updateWidgetSchema,
  execute: async ({ currentConfig, updatePrompt, widgetAnalysis, preserveData }) => {
    try {
      console.log(`🔄 Updating widget: ${widgetAnalysis.widgetId}`);
      console.log(`📝 Update prompt: ${updatePrompt}`);
      console.log(`🔒 Preserve data: ${preserveData}`);

      // Interpret what the user wants to change
      const interpretation = WidgetAnalyzer.interpretUpdatePrompt(updatePrompt, widgetAnalysis);
      console.log(`🎯 Interpretation: ${interpretation.updateType} (confidence: ${interpretation.confidence})`);

      if (interpretation.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${interpretation.warnings.join(', ')}`);
      }

      // Generate the updated configuration using AI
      const updatedConfig = await generateUpdatedConfig(
        currentConfig, 
        updatePrompt, 
        widgetAnalysis, 
        interpretation,
        preserveData
      );

      // Validate the update
      const validation = WidgetAnalyzer.validateUpdate(currentConfig, updatedConfig, widgetAnalysis);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
          interpretation
        };
      }

      console.log(`✅ Widget configuration updated successfully`);
      console.log(`📊 Changes applied: ${interpretation.updateType}`);

      return {
        success: true,
        updatedConfig,
        interpretation,
        warnings: [...interpretation.warnings, ...validation.warnings]
      };

    } catch (error) {
      console.error('Widget update error:', error);
      return {
        success: false,
        errors: [`Failed to update widget: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  },
});

async function generateUpdatedConfig(
  currentConfig: any,
  updatePrompt: string,
  analysis: WidgetAnalysis,
  interpretation: UpdateInterpretation,
  preserveData: boolean
): Promise<any> {
  const systemPrompt = `You are an expert chart configuration specialist. Your job is to intelligently update Highcharts configurations based on user requests while preserving data integrity.

KEY PRINCIPLES:
1. PRESERVE DATA: Never remove or modify the actual data unless explicitly requested
2. MAINTAIN COMPATIBILITY: Ensure chart type changes are compatible with data structure
3. SMART DEFAULTS: Apply sensible defaults for styling and layout
4. VALIDATE CHANGES: Ensure all changes make visual and logical sense

CURRENT CHART ANALYSIS:
- Chart Type: ${analysis.currentChartType}
- Data Structure: ${analysis.dataStructure.seriesCount} series, ${analysis.dataStructure.dataPoints} points
- Has Categories: ${analysis.dataStructure.hasCategories}
- Has Time Series: ${analysis.dataStructure.hasTimeSeries}
- Multiple Series: ${analysis.dataStructure.hasMultipleSeries}

INTERPRETATION:
- Update Type: ${interpretation.updateType}
- Confidence: ${interpretation.confidence}
- Preserve Data: ${preserveData}
- Specific Changes: ${JSON.stringify(interpretation.specificChanges)}

RULES:
1. If changing chart type, update chart.type and series.type consistently
2. If changing colors, apply to both series colors and global color palette
3. If updating titles, ensure proper text formatting
4. If modifying axes, maintain data compatibility
5. Always preserve series data arrays unless explicitly asked to filter
6. Maintain responsive design properties

OUTPUT: Return a complete, valid Highcharts configuration object.`;

  const prompt = `Update this Highcharts configuration based on the user's request.

USER REQUEST: "${updatePrompt}"

CURRENT CONFIG:
\`\`\`json
${JSON.stringify(currentConfig, null, 2)}
\`\`\`

REQUIRED CHANGES:
${interpretation.updateType === 'chartType' ? `- Change chart type to: ${interpretation.specificChanges.newChartType}` : ''}
${interpretation.specificChanges.colorChanges ? `- Apply colors: ${interpretation.specificChanges.colorChanges.join(', ')}` : ''}
${interpretation.specificChanges.titleChange ? `- Update title to: "${interpretation.specificChanges.titleChange}"` : ''}
${interpretation.specificChanges.legendToggle !== undefined ? `- ${interpretation.specificChanges.legendToggle ? 'Show' : 'Hide'} legend` : ''}

CONSTRAINTS:
- Preserve all data in series arrays
- Maintain axis categories if they exist
- Ensure chart type compatibility with data structure
- Keep existing responsive behavior
- Apply consistent styling across all elements

Generate the updated configuration:`;

  const result = await generateText({
    model: anthropic('claude-3-haiku-20240307'),
    system: systemPrompt,
    prompt,
  });

  try {
    // Try to parse the AI response as JSON
    const aiResponse = result.text;
    
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                      aiResponse.match(/(\{[\s\S]*\})/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON configuration found in AI response');
    }

    const updatedConfig = JSON.parse(jsonMatch[1]);

    // Ensure essential properties are preserved
    if (!updatedConfig.series && currentConfig.series) {
      updatedConfig.series = currentConfig.series;
    }
    
    if (!updatedConfig.xAxis && currentConfig.xAxis) {
      updatedConfig.xAxis = currentConfig.xAxis;
    }

    return updatedConfig;

  } catch (error) {
    console.error('Failed to parse AI response:', error);
    
    // Fallback: Apply manual updates
    return applyManualUpdates(currentConfig, interpretation);
  }
}

function applyManualUpdates(currentConfig: any, interpretation: UpdateInterpretation): any {
  const updatedConfig = JSON.parse(JSON.stringify(currentConfig)); // Deep clone

  const { specificChanges } = interpretation;

  // Apply chart type change
  if (specificChanges.newChartType) {
    if (!updatedConfig.chart) updatedConfig.chart = {};
    updatedConfig.chart.type = specificChanges.newChartType;
    
    // Update series type as well
    if (updatedConfig.series) {
      updatedConfig.series.forEach((series: any) => {
        series.type = specificChanges.newChartType;
      });
    }
  }

  // Apply color changes
  if (specificChanges.colorChanges && specificChanges.colorChanges.length > 0) {
    updatedConfig.colors = specificChanges.colorChanges;
    
    // Apply to individual series if present
    if (updatedConfig.series) {
      updatedConfig.series.forEach((series: any, index: number) => {
        if (specificChanges.colorChanges[index]) {
          series.color = specificChanges.colorChanges[index];
        }
      });
    }
  }

  // Apply title change
  if (specificChanges.titleChange) {
    if (!updatedConfig.title) updatedConfig.title = {};
    updatedConfig.title.text = specificChanges.titleChange;
  }

  // Apply legend toggle
  if (specificChanges.legendToggle !== undefined) {
    if (!updatedConfig.legend) updatedConfig.legend = {};
    updatedConfig.legend.enabled = specificChanges.legendToggle;
  }

  // Apply axis changes
  if (specificChanges.axisChanges) {
    if (specificChanges.axisChanges.rotateLabels) {
      if (!updatedConfig.xAxis) updatedConfig.xAxis = {};
      if (!updatedConfig.xAxis.labels) updatedConfig.xAxis.labels = {};
      updatedConfig.xAxis.labels.rotation = -45;
    }
    
    if (specificChanges.axisChanges.logarithmic) {
      if (!updatedConfig.yAxis) updatedConfig.yAxis = {};
      updatedConfig.yAxis.type = 'logarithmic';
    }
  }

  return updatedConfig;
}

// Standalone function for direct usage
export async function updateWidget(
  currentConfig: any,
  updatePrompt: string,
  widgetId: string
): Promise<WidgetUpdateResult> {
  // Create a mock widget for analysis
  const mockWidget = {
    id: widgetId,
    highchartsConfig: currentConfig,
    type: currentConfig.chart?.type || 'column'
  };

  // Analyze the widget
  const analysis = WidgetAnalyzer.analyzeWidget(mockWidget);

  // Use the tool
  const result = await updateWidgetConfig.execute({
    currentConfig,
    updatePrompt,
    widgetAnalysis: analysis,
    preserveData: true
  }, {
    toolCallId: 'direct-call',
    messages: [],
    abortSignal: undefined
  });

  return result as WidgetUpdateResult;
}