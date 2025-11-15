/**
 * AI Tools Registry
 * Central exports for all Vercel AI SDK tools
 */

export { highchartsTools } from './highcharts-tools';
export { dataTools } from './data-tools';

// Re-export specific tools for convenience
export const {
  generateChartConfig,
  suggestChartType,
} = highchartsTools;

export const {
  processData,
  analyzeDataStructure,
  validateDataForChart,
} = dataTools;

// Combined tools object for easy import
export const allTools = {
  ...highchartsTools,
  ...dataTools,
};

/**
 * Tool categories for organized access
 */
export const toolCategories = {
  charts: highchartsTools,
  data: dataTools,
} as const;

/**
 * Tool metadata for documentation and UI generation
 */
export const toolMetadata = {
  generateChartConfig: {
    category: 'charts',
    description: 'Generate complete Highcharts configuration',
    tags: ['charts', 'visualization', 'highcharts'],
  },
  suggestChartType: {
    category: 'charts', 
    description: 'Suggest optimal chart type for data',
    tags: ['charts', 'recommendations', 'analysis'],
  },
  processData: {
    category: 'data',
    description: 'Transform and process raw data',
    tags: ['data', 'transformation', 'processing'],
  },
  analyzeDataStructure: {
    category: 'data',
    description: 'Analyze data structure and suggest visualizations',
    tags: ['data', 'analysis', 'structure'],
  },
  validateDataForChart: {
    category: 'data',
    description: 'Validate data compatibility with chart types', 
    tags: ['data', 'validation', 'compatibility'],
  },
} as const;