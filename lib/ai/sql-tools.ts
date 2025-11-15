import { tool, generateText, stepCountIs } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { SQLExecutor } from '../services/sql-executor';
import { SQLDiffTracker } from '../services/sql-diff';
import { highchartsTools } from './highcharts-tools';
import { savePreparedChart } from '../chart-persistence-tool';

// Tool execution context type
export interface SQLToolContext {
  tableName: string;
  csvId: string;
}

// Track query history for diffing (per CSV ID)
const queryHistory = new Map<string, string[]>();

// Track the most recent SQL results for chart generation (per CSV ID)
const queryResults = new Map<string, { query: string; data: any[]; rowCount: number }>();

export const createSQLTools = (context: SQLToolContext) => ({
  execute_sql: tool({
    description: 'Execute a SQL query against the uploaded CSV dataset. Only SELECT queries are allowed.',
    inputSchema: z.object({
      query: z.string().describe('The SQL SELECT query to execute'),
      explanation: z.string().describe('Explain why this query answers the user\'s question')
    }),
    execute: async ({ query, explanation }) => {
      console.log(`Executing SQL query: ${explanation}`);

      // Track query history and generate diff
      const history = queryHistory.get(context.csvId) || [];
      const previousQuery = history.length > 0 ? history[history.length - 1] : null;
      const diff = SQLDiffTracker.compare(previousQuery, query);
      
      // Detect duplicate query execution
      if (previousQuery && previousQuery.trim() === query.trim()) {
        console.warn('\n⚠️  WARNING: Executing identical query twice! Query #' + (history.length + 1));
        console.warn('This may indicate the AI is not recognizing it already executed this query.');
        return {
          success: false,
          error: 'Duplicate query detected',
          suggestion: 'This exact query was already executed. Check the previous results (queryNumber: ' + history.length + '). Do not execute the same query multiple times.',
          queryNumber: history.length,
          diff: diff ? SQLDiffTracker.formatDiff(diff) : undefined
        };
      }
      
      // Add to history
      history.push(query);
      queryHistory.set(context.csvId, history);

      // Log diff
      if (diff && diff.unifiedDiff) {
        console.log('\n🔄 SQL Query Changed:');
        console.log(SQLDiffTracker.formatDiff(diff));
      }

      const result = await SQLExecutor.executeWithCache(
        query,
        context.tableName,
        context.csvId
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          suggestion: 'Please revise the query and try again.',
          queryNumber: history.length,
          diff: diff ? SQLDiffTracker.formatDiff(diff) : undefined
        };
      }

      // If sampling is enabled, return stratified sample instead of full data
      if (result.sampling_enabled && result.stratifiedSample) {
        console.log(`Returning stratified sample: ${result.stratifiedSample.sample_size} of ${result.rowCount} rows`);

        // Store results for chart generation (use sample data)
        queryResults.set(context.csvId, {
          query,
          data: result.stratifiedSample.sample_rows,
          rowCount: result.rowCount || 0
        });

        return {
          success: true,
          sampled: true,
          totalRows: result.rowCount,
          sampleSize: result.stratifiedSample.sample_size,
          samplingMethod: result.stratifiedSample.sampling_method,
          statistics: result.stratifiedSample.statistics,
          sampleData: result.stratifiedSample.sample_rows,
          executionTimeMs: result.executionTimeMs,
          fromCache: result.fromCache,
          explanation,
          queryNumber: history.length,
          diff: diff ? SQLDiffTracker.formatDiff(diff) : undefined,
          note: `Results were sampled: showing ${result.stratifiedSample.sample_size} representative rows out of ${result.rowCount} total. Use the statistics to understand the full dataset.`
        };
      }

      // Store results for chart generation
      queryResults.set(context.csvId, {
        query,
        data: result.data || [],
        rowCount: result.rowCount || 0
      });

      // Return full data for small result sets
      return {
        success: true,
        sampled: false,
        data: result.data,
        rowCount: result.rowCount,
        executionTimeMs: result.executionTimeMs,
        fromCache: result.fromCache,
        explanation,
        queryNumber: history.length,
        diff: diff ? SQLDiffTracker.formatDiff(diff) : undefined
      };
    },
  }),

  evaluate_results: tool({
    description: `Evaluate if the SQL query results answer the user's question.
    CRITICAL: You MUST check for missing filters (like branch_name) before marking as satisfied.
    Compare current query with previous queries to ensure no filters were accidentally dropped.`,
    inputSchema: z.object({
      satisfied: z.boolean().describe('Are you satisfied with the query results?'),
      reasoning: z.string().describe('Explain your assessment - CHECK FOR MISSING FILTERS!'),
      missingFilters: z.array(z.string()).optional().describe('List any filters that were in previous queries but are missing now'),
      suggestedChanges: z.string().optional().describe('If not satisfied, what changes would improve the query?')
    }),
    execute: async ({ satisfied, reasoning, missingFilters, suggestedChanges }) => {
      console.log(`\n📋 Query Evaluation:`);
      console.log(`   Satisfied: ${satisfied}`);
      console.log(`   Reasoning: ${reasoning}`);
      if (missingFilters && missingFilters.length > 0) {
        console.log(`   ⚠️  Missing filters: ${missingFilters.join(', ')}`);
      }

      return {
        satisfied,
        reasoning,
        missingFilters,
        suggestedChanges,
        shouldContinue: !satisfied || (missingFilters && missingFilters.length > 0)
      };
    },
  }),

  generate_chart: tool({
    description: `Generate a chart visualization from the SQL query results.
    Call this AFTER evaluate_results returns satisfied=true and when the user's request involves visualization or trends.
    This tool will automatically select the best chart type based on the data and user intent.`,
    inputSchema: z.object({
      userIntent: z.string().describe('What the user wants to visualize (e.g., "show trend over time", "compare categories")'),
      suggestedChartType: z.enum(['line', 'column', 'bar', 'pie', 'scatter', 'area']).optional().describe('Optional: suggest a chart type based on data structure'),
    }),
    execute: async ({ userIntent, suggestedChartType }) => {
      console.log(`\n📊 Generating Chart:`);
      console.log(`   User Intent: ${userIntent}`);
      console.log(`   Suggested Type: ${suggestedChartType || 'auto'}`);

      // Get the most recent query results
      const recentResults = queryResults.get(context.csvId);
      if (!recentResults) {
        return {
          success: false,
          error: 'No SQL query results available. Execute a SQL query first.',
        };
      }

      const { query: sqlQuery, data: sqlResults, rowCount } = recentResults;

      if (!sqlResults || sqlResults.length === 0) {
        return {
          success: false,
          error: 'No data available for chart generation.',
        };
      }

      console.log(`   SQL Query: ${sqlQuery.substring(0, 100)}...`);
      console.log(`   Data rows: ${rowCount}`);

      // Prepare chart generation prompt
      const SYSTEM_PROMPT = `You are a data visualization expert. Create a chart from the provided data.
Choose the most appropriate chart type based on the data structure and user intent.

Available chart types:
- generateLineChart: For time series and trends over time
- generateColumnChart: For category comparisons (vertical bars)
- generateBarChart: For horizontal category comparisons (good for long names)
- generatePieChart: For proportions and percentages
- generateScatterChart: For correlations between two variables
- generateAreaChart: For cumulative/volume trends

After creating the chart configuration, you MUST call savePreparedChart to save it.

IMPORTANT:
- Analyze the data columns to determine which should be on x-axis vs y-axis
- Use meaningful axis labels and chart titles
- If the data has date/time columns, consider a line or area chart
- If comparing categories, consider column or bar charts
- If showing proportions, consider pie chart`;

      // Limit data sample for LLM to avoid token limits
      const dataSample = sqlResults.slice(0, 10);

      const prompt = `
## User's Visualization Request
${userIntent}

## Suggested Chart Type
${suggestedChartType || 'Choose the best type based on data'}

## SQL Query That Generated This Data
\`\`\`sql
${sqlQuery}
\`\`\`

## Data Sample (first ${Math.min(10, sqlResults.length)} rows of ${rowCount} total)
\`\`\`json
${JSON.stringify(dataSample, null, 2)}
\`\`\`

## Data Structure
- Total rows: ${rowCount}
- Columns: ${dataSample.length > 0 ? Object.keys(dataSample[0]).join(', ') : 'No columns'}

Please analyze this data and create an appropriate chart visualization.
1. Choose the best chart type for this data
2. Generate the complete Highcharts configuration
3. Save the chart using savePreparedChart
`;

      try {
        // Use nested LLM call to generate chart configuration
        const chartResult = await generateText({
          model: anthropic('claude-3-haiku-20240307'),
          system: SYSTEM_PROMPT,
          prompt,
          tools: {
            generateLineChart: highchartsTools.generateLineChart,
            generateColumnChart: highchartsTools.generateColumnChart,
            generateBarChart: highchartsTools.generateBarChart,
            generatePieChart: highchartsTools.generatePieChart,
            generateScatterChart: highchartsTools.generateScatterChart,
            generateAreaChart: highchartsTools.generateAreaChart,
            savePreparedChart: savePreparedChart,
          },
          stopWhen: stepCountIs(3),
        });

        console.log('🎯 Chart Generation Response:', chartResult.text);
        console.log('🔧 Tool calls:', chartResult.steps?.length || 0);

        // Extract chart configuration and saved chart ID
        let chartConfig: any = null;
        let chartType: string = 'unknown';
        let chartId: string | null = null;
        let saveSuccess = false;

        if (chartResult.steps) {
          for (const step of chartResult.steps) {
            if (step.toolResults) {
              for (const toolResult of step.toolResults) {
                // Extract chart config from Highcharts tool results
                const toolResultAny = toolResult as any;
                if (toolResult.toolName.startsWith('generate') && toolResultAny.output) {
                  chartConfig = toolResultAny.output;
                  // Determine chart type from tool name
                  if (toolResult.toolName.includes('Line')) chartType = 'line';
                  else if (toolResult.toolName.includes('Column')) chartType = 'column';
                  else if (toolResult.toolName.includes('Bar')) chartType = 'bar';
                  else if (toolResult.toolName.includes('Pie')) chartType = 'pie';
                  else if (toolResult.toolName.includes('Scatter')) chartType = 'scatter';
                  else if (toolResult.toolName.includes('Area')) chartType = 'area';
                }
                // Extract save result
                if (toolResult.toolName === 'savePreparedChart' && toolResultAny.output) {
                  const saveResult = toolResultAny.output as any;
                  if (saveResult.success) {
                    saveSuccess = true;
                    chartId = saveResult.chartId;
                  }
                }
              }
            }
          }
        }

        if (!chartConfig) {
          return {
            success: false,
            error: 'Failed to generate chart configuration',
            aiResponse: chartResult.text,
          };
        }

        return {
          success: true,
          chartId: chartId || `generated-${Date.now()}`,
          chartType,
          chartConfig,
          saved: saveSuccess,
          message: `Successfully generated ${chartType} chart${saveSuccess ? ` and saved with ID: ${chartId}` : ''}`,
          dataRows: rowCount,
        };
      } catch (error) {
        console.error('Chart generation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during chart generation',
        };
      }
    },
  }),
});
