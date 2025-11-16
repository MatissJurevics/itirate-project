import { streamText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createSQLTools } from '@/lib/ai/sql-tools';
import { SQLExecutor } from '@/lib/services/sql-executor';
import { DataSampler } from '@/lib/services/data-sampler';
// import { highchartsTools } from '@/lib/ai/highcharts-tools';
// import { dataTools } from '@/lib/ai/data-tools';

export const maxDuration = 30;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: Message[];
  csvId?: string; // Optional CSV ID for SQL analysis
  dashboardId?: string; // Optional dashboard ID for linking charts
}

// Configure LM Studio provider
const lmstudio = createOpenAICompatible({
  name: 'lmstudio',
  baseURL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
});

// Determine which model to use based on environment variable
function getModel() {
  const useLMStudio = process.env.USE_LMSTUDIO === 'true';

  if (useLMStudio) {
    const modelId = process.env.LMSTUDIO_MODEL_ID || 'local-model';
    console.log('Using LM Studio model:', modelId);
    return lmstudio(modelId);
  }

  console.log('Using Anthropic model: claude-3-haiku-20240307');
  return anthropic('claude-haiku-4-5-20251001');
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    console.log('Raw request body:', body);
    const { messages, csvId, dashboardId }: RequestBody = JSON.parse(body);

    // Create SQL tools if we have CSV context
    let tools = {};
    if (csvId) {
      // csvId is now the full table name (e.g., csv_1763255530772_zunrc)
      // Use it directly without adding csv_ prefix
      const tableName = csvId.startsWith('csv_') ? csvId : `csv_${csvId}`;
      console.log('Creating SQL tools for:', { csvId, tableName, dashboardId });
      tools = {
        ...createSQLTools({
          csvId,
          tableName,
          dashboardId
        })
      };
    }

    // Determine the table name for the system prompt
    const systemPromptTableName = csvId
      ? (csvId.startsWith('csv_') ? csvId : `csv_${csvId}`)
      : '';

    let tableProfileSection = '';
    if (csvId && systemPromptTableName) {
      try {
        const promptSample = await SQLExecutor.getPromptSample(systemPromptTableName, 1000);
        if (promptSample) {
          const formattedSample = DataSampler.formatForLLM(promptSample);
          tableProfileSection = `
TABLE STRUCTURE PROFILE (Pre-query sampling)
- Source query: SELECT * FROM csv_to_table.${systemPromptTableName} LIMIT 1000
- Purpose: Provide column awareness before any user query runs

${formattedSample}

Usage notes:
- This profile is ONLY for schema context. Always execute fresh SQL for answers.
- Do not extrapolate final results from this profile—use it to understand columns, types, and typical values.
- Sampling is applied here exclusively; normal query responses should NOT be sampled unless explicitly enabled.
`;
        }
      } catch (error) {
        console.error('Unable to build table profile sample:', error);
      }
    }

    // Track tool execution to detect when tools run but no text is generated
    let toolsExecuted = false;
    let toolNames: string[] = [];
    let lastToolResult: any = null;
    
    console.log('🔍 Initializing tool tracking:', { toolsExecuted, toolNames: toolNames.length });

    const result = streamText({
      model: getModel(),
      messages,
      tools,
      stopWhen: stepCountIs(10), // Increased from 7 to allow more steps for tool execution + response
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('\n' + '='.repeat(80));
        console.log(`📊 STEP FINISHED - Reason: ${finishReason}`);
        console.log('='.repeat(80));

        if (usage) {
          console.log(`\n💰 Token Usage:`);
          console.log(`   Input:  ${usage.inputTokens} tokens`);
          console.log(`   Output: ${usage.outputTokens} tokens`);
          console.log(`   Total:  ${usage.totalTokens} tokens`);
        }

        if (toolCalls && toolCalls.length > 0) {
          toolsExecuted = true;
          toolNames.push(...toolCalls.map(c => c.toolName));
          console.log(`\n🔧 Tool Calls (${toolCalls.length}):`);
          toolCalls.forEach((call, idx) => {
            console.log(`\n   [${idx + 1}] ${call.toolName}`);
            console.log(`       Tool Call ID: ${call.toolCallId}`);
            console.log(`       Input:`, JSON.stringify(call.input, null, 2));
          });
        }

        if (toolResults && toolResults.length > 0) {
          toolsExecuted = true;
          toolNames.push(...toolResults.map(r => r.toolName));
          lastToolResult = toolResults[toolResults.length - 1];
          console.log(`\n✅ Tool Results (${toolResults.length}):`);
          toolResults.forEach((result, idx) => {
            console.log(`\n   [${idx + 1}] ${result.toolName}`);
            console.log(`       Tool Call ID: ${result.toolCallId}`);
            console.log(`       Result:`, JSON.stringify(result, null, 2));
            
            // Log specific tool results for debugging
            if (result.toolName === 'saveDashboardWidget' || result.toolName === 'generate_chart') {
              const output = (result as any).result || (result as any).output;
              if (output) {
                console.log(`\n   🎯 ${result.toolName} Output:`, JSON.stringify(output, null, 2));
                if (output.success === false) {
                  console.error(`\n   ❌ ${result.toolName} FAILED:`, output.error || output.message);
                }
              }
            }
          });
        }

        if (text) {
          const preview = text.substring(0, 200);
          console.log(`\n📝 Generated Text (${text.length} chars):`);
          console.log(`   ${preview}${text.length > 200 ? '...' : ''}`);
        }

        console.log('\n' + '='.repeat(80) + '\n');
      },
      system: csvId
        ? `You are an AI data analyst specialized in SQL-based data analysis and visualization.

Dataset Context:
- Database: PostgreSQL
- Schema: csv_to_table
- Table Name: ${systemPromptTableName}
- Fully Qualified: csv_to_table.${systemPromptTableName}
- CSV ID: ${csvId}
${tableProfileSection ? `\n${tableProfileSection}` : ''}

CRITICAL INSTRUCTIONS:
1. You MUST use the execute_sql tool to answer data questions - never just describe queries
2. Use PostgreSQL syntax (ORDER BY RANDOM(), not RAND())
3. Execute queries immediately - action over explanation
4. DO NOT execute the same query multiple times - check the queryNumber in the response
5. ALWAYS check the SQL DIFF returned with every query - it shows what changed from your previous query
6. The diff uses unified diff format (like GitHub):
   - Lines starting with "-" were REMOVED from the previous query
   - Lines starting with "+" were ADDED to the current query
   - "!!! CRITICAL CHANGES !!!" section highlights LOST FILTERS that must be restored
7. If you see "FILTER LOST: branch_name = 'X'" in the diff, you MUST add that filter back immediately
8. If you see "No changes - query is identical", DO NOT execute the query again
9. After receiving tool results, ALWAYS respond to the user with the findings - never end on a tool call
10. In order to ascertain the structure of the data, run a single SELECT * FROM {table} LIMIT 1

IMPORTANT - Data Sampling:
- A one-time stratified sample (from SELECT * LIMIT 1000) has already been provided above to understand schema shape.
- That pre-sample is for CONTEXT ONLY. You must still execute new SQL queries for every user request.
- General query responses are NOT sampled unless explicitly stated in the tool response.
- When a tool response indicates sampling, describe how it impacts interpretation.

Available Tools:
- execute_sql: Execute SELECT queries against the CSV data table (returns SQL diff showing what changed)
- evaluate_results: REQUIRED after every query - checks for missing filters and validates results
- generate_chart: Create a visualization from your SQL results (call AFTER evaluate_results returns satisfied=true)
- update_widget: Update existing charts (e.g., "make the pie chart red", "change first chart to bar chart")
- delete_widget: Remove existing charts (e.g., "delete the pie chart", "remove first widget")

Query Guidelines:
- Only SELECT queries allowed (no INSERT, UPDATE, DELETE, DROP, etc.)
- Always use LIMIT for safety (default: LIMIT 100)
- Use PostgreSQL functions: RANDOM(), COUNT(), AVG(), SUM(), etc.

Date/Time Best Practices:
- For "last N months", use: DATE_TRUNC('month', CURRENT_DATE) - INTERVAL 'N months'
  This ensures you get N complete calendar months, not partial months
- For monthly grouping, use: DATE_TRUNC('month', date_column)
- For daily grouping, use: DATE_TRUNC('day', date_column)
- Examples:
  * Last 4 complete months: WHERE date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months'
  * This month only: WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
  * Last 7 days: WHERE date >= CURRENT_DATE - INTERVAL '7 days'

FEW-SHOT EXAMPLES:

Example 1: Getting random rows
User: "Select a random row from the table"
Assistant Action: Call execute_sql with:
{
  "query": "SELECT * FROM csv_to_table.${systemPromptTableName} ORDER BY RANDOM() LIMIT 1",
  "explanation": "Using ORDER BY RANDOM() to randomize row selection and LIMIT 1 to return a single random row"
}

Example 2: Counting records
User: "How many rows are in the dataset?"
Assistant Action: Call execute_sql with:
{
  "query": "SELECT COUNT(*) as total_rows FROM csv_to_table.${systemPromptTableName}",
  "explanation": "Using COUNT(*) to get the total number of rows in the table"
}

Example 3: Column analysis
User: "What columns exist in this data?"
Assistant Action: Call execute_sql with:
{
  "query": "SELECT * FROM csv_to_table.${systemPromptTableName} LIMIT 1",
  "explanation": "Fetching one row to inspect available columns and their sample values"
}

Example 4: Aggregation
User: "What's the average price?"
Assistant Action: Call execute_sql with:
{
  "query": "SELECT AVG(price) as average_price, MIN(price) as min_price, MAX(price) as max_price FROM csv_to_table.${systemPromptTableName}",
  "explanation": "Computing average, minimum, and maximum price to provide comprehensive statistics"
}

Example 5: Filtering and grouping
User: "Show me sales by category"
Assistant Action: Call execute_sql with:
{
  "query": "SELECT category, COUNT(*) as count, SUM(sales) as total_sales FROM csv_to_table.${systemPromptTableName} GROUP BY category ORDER BY total_sales DESC LIMIT 20",
  "explanation": "Grouping by category to calculate count and total sales, ordered by sales descending"
}

Example 6: Creating a dashboard (IMPORTANT)
User: "Create a simple dashboard for this data"
Assistant Workflow:
1. First, explore the data structure:
   Call execute_sql: SELECT * FROM csv_to_table.${systemPromptTableName} LIMIT 1
2. Identify numeric and categorical columns from the results
3. Call evaluate_results with satisfied=true
4. Generate charts based on data structure:
   - If date/time column exists: generate_chart for "trend over time"
   - If categorical columns exist: generate_chart for "category distribution"
   - If numeric columns exist: generate_chart for "key metrics comparison"
5. Create 2-3 charts to form a basic dashboard

WORKFLOW:
1. User asks a question about the data
2. You immediately call execute_sql with the appropriate query (DO NOT execute the same query twice!)
3. You receive and interpret the results
4. Call evaluate_results to assess if the results meet the user's needs
5. If the diff shows critical changes (lost filters), call execute_sql again with filters restored
6. Once evaluate_results returns satisfied=true AND the user's request involves visualization/trends/charts:
   - Call generate_chart with the user's visualization intent
   - The chart will be automatically created and saved
7. ALWAYS present the results (and chart info if generated) to the user in your response

CHART GENERATION GUIDELINES:
- Generate charts when users ask to "show", "visualize", "plot", "graph", or "chart" data
- Also generate charts for trend analysis, comparisons, or distribution questions
- **CRITICAL: When user asks to "create a dashboard" or mentions "dashboard", you MUST generate charts!**
  - First explore the data structure with a SELECT * LIMIT 1
  - Then identify key metrics and dimensions
  - Generate multiple charts (at least 2-3) to create a meaningful dashboard
  - Common dashboard charts: overview metrics, trends over time, category breakdowns, top/bottom performers
- The generate_chart tool will automatically select the best chart type
- You can suggest a chart type based on the data structure (line for time series, column for categories, etc.)

WIDGET UPDATE GUIDELINES:
- **CRITICAL: Use update_widget to modify EXISTING charts, NOT generate_chart**
- When user says "make the pie chart red", "change first chart to bar", "update title" - use update_widget
- Widget identifiers: "first", "second", "last", "pie", "bar", "sales", etc.
- Only use generate_chart for NEW visualizations, never for modifying existing ones
- Examples requiring update_widget:
  * "make the pi chart red" → update_widget with widgetIdentifier: "pie"
  * "change first chart colors" → update_widget with widgetIdentifier: "first"  
  * "update the title of the bar chart" → update_widget with widgetIdentifier: "bar"

WIDGET DELETION GUIDELINES:
- **CRITICAL: Use delete_widget to remove EXISTING charts**
- When user says "delete the pie chart", "remove first widget", "delete sales chart" - use delete_widget
- Widget identifiers: same as update_widget ("first", "second", "last", "pie", "bar", "sales", etc.)
- Always confirm deletion and provide clear feedback about what was removed
- Examples requiring delete_widget:
  * "delete the pie chart" → delete_widget with widgetIdentifier: "pie"
  * "remove first widget" → delete_widget with widgetIdentifier: "first"
  * "delete the sales chart" → delete_widget with widgetIdentifier: "sales"
- After deletion, inform user what was removed and how many widgets remain

IMPORTANT RESPONSE RULES:
- After tool execution, ALWAYS provide a natural language response to the user
- Never end on a tool call - always follow up with text explaining the results
- Check the SQL diff for every query to ensure filters weren't accidentally dropped
- If you see "No changes - query is identical", DO NOT execute again
- When a chart is generated, inform the user of the chart type and ID

Remember: Execute tools immediately. Don't just explain what you would do - actually do it!`
        : `You are an AI assistant specialized in data visualization and chart creation using Highcharts.

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

Available tools when CSV data is provided:
- execute_sql: Query CSV data with SELECT statements

Always prioritize user experience and create visually appealing, accessible charts.`,
    });

    // Log tool execution status before creating response
    console.log('🔍 Tool execution status before response:', { 
      toolsExecuted, 
      toolNames, 
      toolCount: toolNames.length 
    });
    
    // Get the stream response from the result
    const streamResponse = result.toTextStreamResponse();
    
    // Clone the response and add custom headers
    const headers = new Headers(streamResponse.headers);
    
    if (toolsExecuted && toolNames.length > 0) {
      headers.set('X-Tools-Executed', 'true');
      headers.set('X-Tool-Names', toolNames.join(','));
      console.log('✅ Setting tool execution headers:', { toolNames });
    } else {
      console.log('⚠️ No tools executed or tool names empty');
    }
    
    // Create a new Response with the original body but updated headers
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers: headers
    });
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
