import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
// import { highchartsTools } from '@/lib/ai/highcharts-tools';
// import { dataTools } from '@/lib/ai/data-tools';

export const maxDuration = 30;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: Message[];
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    console.log('Raw request body:', body);
    const { messages }: RequestBody = JSON.parse(body);

    const result = streamText({
      model: anthropic('claude-3-5-haiku-20241022'),
      messages,
      system: `You are an AI assistant specialized in data visualization and chart creation using Highcharts.

Your capabilities include:
1. **Chart Generation**: Create comprehensive Highcharts configurations with proper TypeScript typing
2. **Chart Type Suggestions**: Recommend optimal chart types based on data characteristics and visualization goals
3. **Data Processing**: Transform and analyze data to prepare it for visualization
4. **Data Validation**: Ensure data compatibility with specific chart types

When helping users:
- Always suggest the most appropriate chart type based on their data and goals
- Provide complete, working Highcharts configurations
- Explain your recommendations and reasoning
- Offer alternatives when appropriate
- Ensure all chart configurations follow Highcharts best practices

Available tools:
- generateChartConfig: Creates complete Highcharts configuration objects
- suggestChartType: Recommends chart types based on data and goals  
- processData: Transforms raw data for visualization
- analyzeDataStructure: Analyzes data to suggest optimal configurations
- validateDataForChart: Validates data compatibility with chart types

Always prioritize user experience and create visually appealing, accessible charts.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
