/**
 * AI Tools Registry
 * Central exports for all Vercel AI SDK tools
 */

export { highchartsTools } from './highcharts-tools';
export { dataTools } from './data-tools';
export { createSQLTools } from './sql-tools';

// Combined tools object for easy import
export const allChartTools = {
  // Re-export from highchartsTools
};

/**
 * Tool categories for organized access
 */
export const toolCategories = {
  charts: 'highchartsTools',
  data: 'dataTools',
  sql: 'sqlTools',
} as const;

/**
 * Tool metadata for documentation and UI generation
 */
export const toolMetadata = {
  generateLineChart: {
    category: 'charts',
    description: 'Generate line chart configuration',
    tags: ['charts', 'visualization', 'highcharts', 'time-series'],
  },
  generateColumnChart: {
    category: 'charts',
    description: 'Generate column chart configuration',
    tags: ['charts', 'visualization', 'highcharts', 'comparison'],
  },
  generateBarChart: {
    category: 'charts',
    description: 'Generate bar chart configuration',
    tags: ['charts', 'visualization', 'highcharts', 'comparison'],
  },
  generatePieChart: {
    category: 'charts',
    description: 'Generate pie chart configuration',
    tags: ['charts', 'visualization', 'highcharts', 'proportions'],
  },
  generateScatterChart: {
    category: 'charts',
    description: 'Generate scatter chart configuration',
    tags: ['charts', 'visualization', 'highcharts', 'correlation'],
  },
  execute_sql: {
    category: 'sql',
    description: 'Execute SQL queries against CSV data',
    tags: ['sql', 'data', 'query'],
  },
  evaluate_results: {
    category: 'sql',
    description: 'Evaluate if SQL results satisfy the query',
    tags: ['sql', 'validation', 'assessment'],
  },
  generate_chart: {
    category: 'sql',
    description: 'Generate chart from SQL results',
    tags: ['sql', 'charts', 'visualization'],
  },
} as const;