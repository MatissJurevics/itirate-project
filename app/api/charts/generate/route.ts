import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { highchartsTools } from '@/lib/ai/highcharts-tools';
import { savePreparedChart } from '@/lib/chart-persistence-tool';

export async function POST(req: Request) {
  try {
    const { sqlQuery, sqlResults, userPrompt, csvId } = await req.json();

    if (!sqlQuery || !sqlResults || !csvId) {
      return Response.json(
        { error: 'Missing required fields: sqlQuery, sqlResults, csvId' },
        { status: 400 }
      );
    }

    const SYSTEM_PROMPT = `Create a chart from the provided data. Choose the most appropriate chart type based on the data structure and user request. 

Available chart types:
- generateLineChart: For time series
- generateColumnChart: For category comparisons
- generateBarChart: For horizontal categories  
- generatePieChart: For proportions
- generateScatterChart: For correlations

After creating the chart, save it using savePreparedChart.`;

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

Please analyze this data and create an appropriate chart visualization. Consider the user's intent and the nature of the data to choose the best chart type.
`;

    // Use only essential chart tools to avoid overwhelming the AI
    const essentialTools = {
      generateLineChart: highchartsTools.generateLineChart,
      generateColumnChart: highchartsTools.generateColumnChart,
      generateBarChart: highchartsTools.generateBarChart,
      generatePieChart: highchartsTools.generatePieChart,
      generateScatterChart: highchartsTools.generateScatterChart,
      savePreparedChart
    };
    
    console.log('🔧 Available tools:', Object.keys(essentialTools));
    
    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      system: SYSTEM_PROMPT,
      prompt,
      tools: essentialTools,
      stopWhen: stepCountIs(3)
    });
    
    console.log('🎯 AI Response:', result.text);
    console.log('🔧 Tool calls:', result.toolResults?.length || 0);

    // Extract chart configuration
    let chartConfig: any = null;
    let chartType: string = 'unknown';

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

    // Save the chart to database
    let chartId: string | null = null;
    let saveSuccess = false;
    let saveError: string | null = null;
    
    try {
      console.log('🔄 Saving chart to database...');
      console.log('📊 Chart Type:', chartType);
      console.log('📋 CSV ID:', csvId);

      if (!savePreparedChart.execute) {
        throw new Error('savePreparedChart.execute is not defined');
      }

      const saveResult = await savePreparedChart.execute({
        csvId,
        sqlQuery,
        chartOptions: chartConfig,
        chartType,
        userPrompt: userPrompt || 'Generate chart'
      }, { toolCallId: 'direct-save', messages: [], abortSignal: undefined });
      
      console.log('💾 Save result:', JSON.stringify(saveResult, null, 2));
      
      if (saveResult && typeof saveResult === 'object' && 'success' in saveResult) {
        saveSuccess = saveResult.success as boolean;
        if (saveResult.success && 'chartId' in saveResult) {
          chartId = saveResult.chartId as string;
        } else if ('error' in saveResult) {
          saveError = saveResult.error as string;
        }
      }
    } catch (error) {
      console.error('Failed to save chart:', error);
      saveError = error instanceof Error ? error.message : 'Unknown save error';
    }

    return Response.json({
      success: true,
      chartId: chartId || `generated-${Date.now()}`,
      chartConfig,
      chartType,
      dataPreview: dataSample,
      totalRows,
      saved: saveSuccess,
      saveError,
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
