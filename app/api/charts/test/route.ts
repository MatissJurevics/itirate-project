import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { highchartsTools } from '@/lib/ai/highcharts-tools';
import { z } from 'zod';
import { tool } from 'ai';

const savePreparedChartSchema = z.object({
  csvId: z.string().describe('UUID of the CSV file this chart is based on'),
  sqlQuery: z.string().describe('The SQL query that generated the data'),
  chartOptions: z.object({}).passthrough().describe('Complete Highcharts configuration object'),
  chartType: z.string().describe('Type of chart (line, bar, pie, scatter, etc.)'),
  userPrompt: z.string().optional().describe('Original user question/prompt')
});

// Mock savePreparedChart tool that logs instead of saving to database
const mockSavePreparedChart = tool({
  description: 'Mock tool that logs chart configuration instead of saving to database',
  inputSchema: savePreparedChartSchema,
  execute: async ({ csvId, sqlQuery, chartOptions, chartType, userPrompt }) => {
    console.log('=== CHART GENERATION TEST RESULTS ===');
    console.log('CSV ID:', csvId);
    console.log('Chart Type:', chartType);
    console.log('User Prompt:', userPrompt);
    console.log('SQL Query:', sqlQuery);
    console.log('Chart Options:', JSON.stringify(chartOptions, null, 2));
    console.log('=====================================');
    
    return {
      success: true,
      chartId: `test-chart-${Date.now()}`,
      message: `Mock chart saved successfully. Type: ${chartType}`
    };
  }
});

const SYSTEM_PROMPT = `You are a data visualization expert that creates Highcharts configurations from SQL query results.

## Your Task
1. Analyze the user's original question and SQL results
2. Choose the most appropriate chart type based on the data and user intent
3. Transform the SQL results into the correct format for that chart type
4. Generate a Highcharts configuration using the available tools
5. Save the chart configuration using the mockSavePreparedChart tool

## Data Transformation Rules

### LINE/COLUMN/BAR/AREA Charts (use generateLineChart, generateColumnChart, generateBarChart, generateAreaChart):
- Input: \`[{ date: '2024-01', sales: 1000 }, { date: '2024-02', sales: 1200 }]\`
- Transform to:
  - \`series[0].data = [1000, 1200]\`
  - \`xAxis.categories = ['2024-01', '2024-02']\`
- For multiple series, create separate data arrays for each metric

### SCATTER/BUBBLE Charts (use generateScatterChart, generateBubbleChart):
- Extract two numeric columns for scatter: \`[[x1, y1], [x2, y2]]\`
- For bubble charts, add third dimension: \`[[x, y, z]]\` where z is bubble size

### PIE Charts (use generatePieChart):
- Group by category and aggregate values
- Transform to: \`[{ name: 'Category1', y: 100 }, { name: 'Category2', y: 200 }]\`

## Chart Selection Guidelines
- **Line/Area**: Time series data, trends over time
- **Column/Bar**: Categorical comparisons, rankings
- **Pie**: Parts of a whole, percentages, proportions  
- **Scatter**: Correlation between two variables
- **Bubble**: Three-dimensional relationships

## Important Notes
- Always include meaningful titles, axis labels, and series names
- Set chart.type explicitly in the configuration
- Use appropriate colors and styling for readability

IMPORTANT: After creating the chart configuration, you MUST call mockSavePreparedChart to save/log the complete chart with the provided csvId, sqlQuery, chartType, and userPrompt. This step is REQUIRED.`;

// Test data scenarios
const testScenarios = {
  timeSeries: {
    userPrompt: "Show me sales trends over the last 6 months",
    sqlQuery: "SELECT DATE_TRUNC('month', created_at) as month, SUM(amount) as total_sales FROM orders WHERE created_at >= NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month",
    sqlResults: [
      { month: '2024-06-01', total_sales: 15000 },
      { month: '2024-07-01', total_sales: 18500 },
      { month: '2024-08-01', total_sales: 22000 },
      { month: '2024-09-01', total_sales: 19500 },
      { month: '2024-10-01', total_sales: 25000 },
      { month: '2024-11-01', total_sales: 28000 }
    ],
    csvId: 'test-csv-001'
  },
  
  categorical: {
    userPrompt: "Compare product categories by revenue",
    sqlQuery: "SELECT category, SUM(revenue) as total_revenue FROM products GROUP BY category ORDER BY total_revenue DESC",
    sqlResults: [
      { category: 'Electronics', total_revenue: 145000 },
      { category: 'Clothing', total_revenue: 89000 },
      { category: 'Books', total_revenue: 34000 },
      { category: 'Home & Garden', total_revenue: 67000 },
      { category: 'Sports', total_revenue: 45000 }
    ],
    csvId: 'test-csv-002'
  },

  proportion: {
    userPrompt: "Show market share distribution",
    sqlQuery: "SELECT company, market_share FROM market_data WHERE year = 2024",
    sqlResults: [
      { company: 'Company A', market_share: 35.5 },
      { company: 'Company B', market_share: 28.2 },
      { company: 'Company C', market_share: 18.7 },
      { company: 'Company D', market_share: 12.1 },
      { company: 'Others', market_share: 5.5 }
    ],
    csvId: 'test-csv-003'
  },

  correlation: {
    userPrompt: "Analyze relationship between advertising spend and revenue",
    sqlQuery: "SELECT advertising_spend, revenue FROM campaigns WHERE year = 2024",
    sqlResults: [
      { advertising_spend: 5000, revenue: 25000 },
      { advertising_spend: 8000, revenue: 42000 },
      { advertising_spend: 12000, revenue: 58000 },
      { advertising_spend: 15000, revenue: 73000 },
      { advertising_spend: 20000, revenue: 95000 },
      { advertising_spend: 18000, revenue: 87000 },
      { advertising_spend: 10000, revenue: 48000 },
      { advertising_spend: 25000, revenue: 125000 }
    ],
    csvId: 'test-csv-004'
  }
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scenario = searchParams.get('scenario') || 'timeSeries';
  
  const testData = testScenarios[scenario as keyof typeof testScenarios];
  
  if (!testData) {
    return Response.json({ 
      error: 'Invalid scenario', 
      availableScenarios: Object.keys(testScenarios) 
    }, { status: 400 });
  }

  try {
    const { sqlQuery, sqlResults, userPrompt, csvId } = testData;
    
    const prompt = `
## User's Original Question
${userPrompt}

## SQL Query Executed
\`\`\`sql
${sqlQuery}
\`\`\`

## SQL Results (${sqlResults.length} total rows)
\`\`\`json
${JSON.stringify(sqlResults, null, 2)}
\`\`\`

## Full Dataset Info
- Total rows: ${sqlResults.length}
- Columns: ${sqlResults.length > 0 ? Object.keys(sqlResults[0]).join(', ') : 'No data'}

Please analyze this data and create an appropriate chart visualization. Consider the user's intent and the nature of the data to choose the best chart type.
`;

    console.log(`\n🧪 Testing scenario: ${scenario}`);
    console.log(`📊 Data type: ${userPrompt}`);

    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      system: SYSTEM_PROMPT,
      prompt,
      tools: {
        ...highchartsTools,
        mockSavePreparedChart
      }
    });

    // Extract results
    let chartConfig: any = null;
    let mockSaveResult: any = null;

    if (result.toolResults) {
      for (const toolResult of result.toolResults) {
        if (toolResult.toolName === 'mockSavePreparedChart') {
          mockSaveResult = toolResult.output;
        }
        if (toolResult.toolName.startsWith('generate') && toolResult.output) {
          chartConfig = toolResult.output;
        }
      }
    }

    return Response.json({
      success: true,
      scenario,
      testData: {
        userPrompt,
        sqlQuery,
        dataRows: sqlResults.length,
        sampleData: sqlResults.slice(0, 3)
      },
      aiResponse: result.text,
      chartConfig,
      mockSaveResult,
      toolCalls: result.toolResults?.map(tr => ({
        tool: tr.toolName,
        success: !!tr.output,
        result: tr.output
      }))
    });

  } catch (error) {
    console.error('Test error:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { scenario, customData } = await req.json();
    
    // Allow custom test data
    if (customData) {
      const { sqlQuery, sqlResults, userPrompt, csvId } = customData;
      
      const prompt = `
## User's Original Question
${userPrompt}

## SQL Query Executed
\`\`\`sql
${sqlQuery}
\`\`\`

## SQL Results
\`\`\`json
${JSON.stringify(sqlResults, null, 2)}
\`\`\`

Please analyze this data and create an appropriate chart visualization.
`;

      const result = await generateText({
        model: anthropic('claude-3-haiku-20240307'),
        system: SYSTEM_PROMPT,
        prompt,
        tools: {
          ...highchartsTools,
          mockSavePreparedChart
        }
      });

      return Response.json({
        success: true,
        customTest: true,
        aiResponse: result.text,
        toolResults: result.toolResults
      });
    }

    return Response.json({ error: 'No custom data provided' }, { status: 400 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}