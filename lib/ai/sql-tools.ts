import { tool } from 'ai';
import { z } from 'zod';
import { SQLExecutor } from '../services/sql-executor';
import { SQLDiffTracker } from '../services/sql-diff';

// Tool execution context type
export interface SQLToolContext {
  tableName: string;
  csvId: string;
}

// Track query history for diffing (per CSV ID)
const queryHistory = new Map<string, string[]>();

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
  })
});
