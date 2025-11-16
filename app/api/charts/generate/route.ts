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

    const SYSTEM_PROMPT = `You are a data visualization expert. Generate a chart configuration using the appropriate chart tool.

For this category data, call generateColumnChart to create a column chart that compares the categories by count.

Available chart types:
- generateLineChart: For time series
- generateColumnChart: For category comparisons (USE THIS)
- generateBarChart: For horizontal categories  
- generatePieChart: For proportions
- generateScatterChart: For correlations

Call generateColumnChart now!`;

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

Call generateColumnChart with the category data above to create a column chart!
`;

    // Use only chart generation tools - we'll handle dashboard saving manually
    const essentialTools = {
      generateLineChart: highchartsTools.generateLineChart,
      generateColumnChart: highchartsTools.generateColumnChart,
      generateBarChart: highchartsTools.generateBarChart,
      generatePieChart: highchartsTools.generatePieChart,
      generateScatterChart: highchartsTools.generateScatterChart
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

    // Always save to dashboard after successful chart generation
    if (chartConfig) {
      try {
        console.log('🔄 Manually saving widget to dashboard...');
        console.log('📊 Chart Type:', chartType);
        console.log('🏷️  Dashboard ID:', dashboardId);

        const saveResult = await saveDashboardWidget.execute({
          dashboardId,
          sqlQuery,
          chartOptions: chartConfig,
          chartType,
          userPrompt: userPrompt || 'Generate chart',
          title: title || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`
        }, { toolCallId: 'manual-save', messages: [], abortSignal: undefined });
        
        console.log('💾 Manual save result:', JSON.stringify(saveResult, null, 2));
        
        if (saveResult && typeof saveResult === 'object' && 'success' in saveResult) {
          saveSuccess = saveResult.success as boolean;
          if (saveResult.success && 'widgetId' in saveResult) {
            widgetId = saveResult.widgetId as string;
          }
        }
      } catch (error) {
        console.error('Failed to manually save widget:', error);
      }
    }

    // Return just the Highcharts configuration
    return Response.json(chartConfig);

  } catch (error) {
    console.error('Chart generation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
