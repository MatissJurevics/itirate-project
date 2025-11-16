import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { highchartsTools } from '@/lib/ai/highcharts-tools';
import { saveDashboardWidget } from '@/lib/dashboard-widget-tool';

export async function POST(req: Request) {
  try {
    const { sqlQuery, sqlResults, userPrompt, dashboardId, title } = await req.json();

    if (!sqlQuery || !sqlResults || !dashboardId) {
      return Response.json(
        { error: 'Missing required fields: sqlQuery, sqlResults, dashboardId' },
        { status: 400 }
      );
    }

    const SYSTEM_PROMPT = `You are a data visualization expert. You must ALWAYS perform both steps:

STEP 1: Generate the chart configuration
STEP 2: Save it to the dashboard  

For this category data, you MUST:
1. Call generateColumnChart to create the chart
2. IMMEDIATELY after, call saveDashboardWidget to save it

You cannot complete the task without calling BOTH tools. The user needs the chart saved to their dashboard.

Available tools:
- generateColumnChart: Perfect for this category data
- saveDashboardWidget: Required to save the chart

CRITICAL: After generating the chart, you MUST call saveDashboardWidget or the user's request will be incomplete!`;

    // Limit data sample for LLM to avoid token limits
    const dataSample = sqlResults.slice(0, 10);
    const totalRows = sqlResults.length;

    const prompt = `
## User's Original Question
${userPrompt || 'Create a chart from this data'}

## SQL Query Executed
\`\`\`sql
${sqlQuery}
\`\`\`

## SQL Results Sample (first 10 rows of ${totalRows} total)
\`\`\`json
${JSON.stringify(dataSample, null, 2)}
\`\`\`

## Full Dataset Info
- Total rows: ${totalRows}
- Columns: ${dataSample.length > 0 ? Object.keys(dataSample[0]).join(', ') : 'No data'}

REQUIRED ACTION: Execute these 2 tool calls in sequence:

1. generateColumnChart with the data above
2. saveDashboardWidget with:
   - dashboardId: "${dashboardId}"
   - sqlQuery: "${sqlQuery}"
   - chartOptions: (the result from step 1)
   - chartType: "column"  
   - userPrompt: "${userPrompt}"
   - title: "${title || 'Chart'}"

You MUST call both tools to complete this request!
`;

    // Use only essential chart tools to avoid overwhelming the AI
    const essentialTools = {
      generateLineChart: highchartsTools.generateLineChart,
      generateColumnChart: highchartsTools.generateColumnChart,
      generateBarChart: highchartsTools.generateBarChart,
      generatePieChart: highchartsTools.generatePieChart,
      generateScatterChart: highchartsTools.generateScatterChart,
      saveDashboardWidget: saveDashboardWidget
    };
    
    console.log('🔧 Available tools:', Object.keys(essentialTools));
    
    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      system: SYSTEM_PROMPT,
      prompt,
      tools: essentialTools,
      toolChoice: 'required',
      stopWhen: stepCountIs(3)
    });
    
    console.log('🎯 AI Response:', result.text);
    console.log('🔧 Tool calls:', result.toolResults?.length || 0);
    console.log('🔧 Tool names called:', result.toolResults?.map(tr => tr.toolName) || []);

    // Extract chart configuration and dashboard save results
    let chartConfig: any = null;
    let chartType: string = 'unknown';
    let widgetId: string | null = null;
    let saveSuccess = false;

    if (result.toolResults) {
      for (const toolResult of result.toolResults) {
        // Extract chart config from Highcharts tool results
        if (toolResult.toolName.startsWith('generate') && toolResult.output) {
          chartConfig = toolResult.output;
          // Determine chart type from tool name
          if (toolResult.toolName.includes('Line')) chartType = 'line';
          else if (toolResult.toolName.includes('Column')) chartType = 'column';
          else if (toolResult.toolName.includes('Bar')) chartType = 'bar';
          else if (toolResult.toolName.includes('Pie')) chartType = 'pie';
          else if (toolResult.toolName.includes('Scatter')) chartType = 'scatter';
        }
        // Extract save result from dashboard widget tool
        if (toolResult.toolName === 'saveDashboardWidget' && toolResult.output) {
          const saveResult = toolResult.output as any;
          if (saveResult.success) {
            saveSuccess = true;
            widgetId = saveResult.widgetId;
          }
        }
      }
    }

    // Return error if we don't have chart configuration
    if (!chartConfig) {
      return Response.json(
        {
          error: 'Failed to generate chart configuration',
          debug: {
            toolResultsCount: result.toolResults?.length || 0,
            toolNames: result.toolResults?.map(tr => tr.toolName) || [],
            aiResponse: result.text
          }
        },
        { status: 500 }
      );
    }

    // Dashboard saving is now handled by the AI using the saveDashboardWidget tool

    return Response.json({
      success: true,
      widgetId: widgetId || `widget-${Date.now()}`,
      dashboardId,
      chartConfig,
      chartType,
      dataPreview: dataSample,
      totalRows,
      saved: saveSuccess,
      saveError: saveSuccess ? null : 'Dashboard save failed',
      aiResponse: result.text
    });

  } catch (error) {
    console.error('Chart generation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
