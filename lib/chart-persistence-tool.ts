import { z } from 'zod';
import { tool } from 'ai';

const savePreparedChartSchema = z.object({
  csvId: z.string().describe('UUID of the CSV file this chart is based on'),
  sqlQuery: z.string().describe('The SQL query that generated the data'),
  chartOptions: z.object({}).passthrough().describe('Complete Highcharts configuration object'),
  chartType: z.string().describe('Type of chart (line, bar, pie, scatter, etc.)'),
  userPrompt: z.string().optional().describe('Original user question/prompt')
});

export const savePreparedChart = tool({
  description: 'Save chart configuration by logging to console',
  inputSchema: savePreparedChartSchema,
  execute: async ({ csvId, sqlQuery, chartOptions, chartType, userPrompt }) => {
    console.log('\n🎯 === CHART CONFIGURATION SAVED ===');
    console.log('📊 Chart Type:', chartType);
    console.log('💬 User Prompt:', userPrompt);
    console.log('🗂️  CSV ID:', csvId);
    console.log('📝 SQL Query:', sqlQuery);
    console.log('⚙️  Chart Options:');
    console.log(JSON.stringify(chartOptions, null, 2));
    console.log('=====================================\n');
    
    return {
      success: true,
      chartId: `chart-${Date.now()}`,
      message: `Chart configuration saved successfully. Type: ${chartType}`
    };
  }
});