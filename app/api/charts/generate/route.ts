import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { highchartsTools } from '@/lib/ai/highcharts-tools';
import { savePreparedChart } from '@/lib/chart-persistence-tool';
import { convertHighchartsToWidget, extractChartTypeFromToolName } from '@/lib/adapters/highcharts-to-widget';

const SYSTEM_PROMPT = `You are a data visualization expert. 

Your task:
1. Choose the best chart type for the data
2. Use the appropriate generate tool to create a chart
3. Call savePreparedChart to save the configuration

Available tools:
- generateLineChart: For time series data
- generateColumnChart/generateBarChart: For category comparisons  
- generatePieChart: For proportions/percentages
- generateScatterChart: For correlations
- savePreparedChart: REQUIRED - saves the chart

Data transformation:
- For bar/line charts: transform [{category: "A", value: 100}] to categories=["A"] and data=[100]
- For pie charts: transform to [{name: "A", y: 100}]

WORKFLOW:
1. First, use a generate tool to create the chart
2. Then, IMMEDIATELY call savePreparedChart with the same chartOptions

Example:
- Call generateColumnChart with chartOptions
- Then call savePreparedChart with the same chartOptions plus csvId, sqlQuery, chartType, userPrompt`;

export async function POST(req: Request) {
  try {
    const { sqlQuery, sqlResults, userPrompt, csvId } = await req.json();

    if (!sqlQuery || !sqlResults || !csvId) {
      return Response.json(
        { error: 'Missing required fields: sqlQuery, sqlResults, csvId' },
        { status: 400 }
      );
    }

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

    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      system: SYSTEM_PROMPT,
      prompt,
      tools: {
        ...highchartsTools,
        savePreparedChart
      }
    });

    // Extract chart configuration and convert to widget format
    let chartId: string | null = null;
    let highchartsConfig: any = null;
    let chartToolName: string = '';

    if (result.toolResults) {
      for (const toolResult of result.toolResults) {
        if (toolResult.toolName === 'savePreparedChart' && toolResult.output) {
          const saveResult = toolResult.output as any;
          chartId = saveResult.chartId;
        }
        // Extract chart config from Highcharts tool results
        if (toolResult.toolName.startsWith('generate') && toolResult.output) {
          highchartsConfig = toolResult.output;
          chartToolName = toolResult.toolName;
        }
      }
    }

    // Convert Highcharts config to widget config if we have the chart data
    let widgetConfig = null;
    if (highchartsConfig) {
      const chartType = extractChartTypeFromToolName(chartToolName);
      widgetConfig = convertHighchartsToWidget(highchartsConfig, chartType);
    }

    // Return success if we have either chart ID (from save) or widget config (from generation)
    if (!chartId && !widgetConfig) {
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

    return Response.json({
      success: true,
      chartId: chartId || `generated-${Date.now()}`,
      highchartsConfig,
      widgetConfig,
      chartType: extractChartTypeFromToolName(chartToolName),
      dataPreview: dataSample,
      totalRows,
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