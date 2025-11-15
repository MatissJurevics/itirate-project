import { tool } from 'ai';
import { z } from 'zod';
import type * as Highcharts from 'highcharts';

/**
 * Common schema components shared across chart types
 */
const createCommonSchemas = () => {
  const titleSchema = z.object({
    text: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional();

  const axisSchema = z.object({
    categories: z.array(z.string()).optional().describe('Category labels for the axis'),
    title: z.object({
      text: z.string().optional(),
    }).passthrough().optional(),
    type: z.enum(['linear', 'logarithmic', 'datetime', 'category']).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    labels: z.record(z.string(), z.unknown()).optional(),
  }).passthrough();

  const tooltipSchema = z.object({
    enabled: z.boolean().optional(),
    shared: z.boolean().optional(),
    crosshairs: z.boolean().optional(),
    // Note: formatter functions cannot be set via AI tools (functions are not JSON-serializable)
  }).passthrough().optional();

  const legendSchema = z.object({
    enabled: z.boolean().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    layout: z.enum(['horizontal', 'vertical', 'proximate']).optional(),
  }).passthrough().optional();

  return { titleSchema, axisSchema, tooltipSchema, legendSchema };
};

/**
 * Schema factory for basic charts (line, column, bar, area)
 * These charts use simple numeric arrays for data
 */
const createBasicChartSchema = (chartType: 'line' | 'spline' | 'column' | 'bar' | 'area' | 'areaspline') => {
  const { titleSchema, axisSchema, tooltipSchema, legendSchema } = createCommonSchemas();

  return z.object({
    chart: z.object({
      type: z.literal(chartType).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      backgroundColor: z.string().optional(),
      animation: z.boolean().optional(),
    }).passthrough().optional(),

    title: titleSchema,
    subtitle: titleSchema,

    xAxis: z.union([axisSchema, z.array(axisSchema)]).optional(),
    yAxis: z.union([axisSchema, z.array(axisSchema)]).optional(),

    series: z.array(z.object({
      name: z.string().optional().describe('Series name shown in legend'),
      data: z.array(z.number()).describe('Simple numeric values for the data points'),
      color: z.string().optional().describe('Hex color code or named color'),
      yAxis: z.union([z.number(), z.string()]).optional(),
    }).passthrough()).describe('Array of data series to display'),

    plotOptions: z.record(z.string(), z.unknown()).optional(),
    tooltip: tooltipSchema,
    legend: legendSchema,

    colors: z.array(z.string()).optional().describe('Global color palette for series'),
    credits: z.object({ enabled: z.boolean().optional() }).optional(),

  }).passthrough();
};

/**
 * Schema for scatter and bubble charts
 * Uses [x, y] or [x, y, z] coordinate arrays
 */
const createScatterChartSchema = (chartType: 'scatter' | 'bubble') => {
  const { titleSchema, axisSchema, tooltipSchema, legendSchema } = createCommonSchemas();

  const dataSchema = chartType === 'bubble'
    ? z.array(z.array(z.number()).length(3)).describe('Array of [x, y, z] coordinates where z is the bubble size')
    : z.array(z.array(z.number()).length(2)).describe('Array of [x, y] coordinate pairs');

  return z.object({
    chart: z.object({
      type: z.literal(chartType).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      backgroundColor: z.string().optional(),
      animation: z.boolean().optional(),
    }).passthrough().optional(),

    title: titleSchema,
    subtitle: titleSchema,

    xAxis: z.union([axisSchema, z.array(axisSchema)]).optional(),
    yAxis: z.union([axisSchema, z.array(axisSchema)]).optional(),

    series: z.array(z.object({
      name: z.string().optional(),
      data: dataSchema,
      color: z.string().optional(),
      marker: z.object({
        radius: z.number().optional(),
        symbol: z.string().optional(),
      }).passthrough().optional(),
    }).passthrough()).describe('Array of data series with coordinate pairs'),

    plotOptions: z.record(z.string(), z.unknown()).optional(),
    tooltip: tooltipSchema,
    legend: legendSchema,

    colors: z.array(z.string()).optional(),
    credits: z.object({ enabled: z.boolean().optional() }).optional(),

  }).passthrough();
};

/**
 * Schema for pie charts
 * Uses objects with name and y (value) properties
 */
const createPieChartSchema = () => {
  const { titleSchema, tooltipSchema, legendSchema } = createCommonSchemas();

  return z.object({
    chart: z.object({
      type: z.literal('pie').optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      backgroundColor: z.string().optional(),
      animation: z.boolean().optional(),
    }).passthrough().optional(),

    title: titleSchema,
    subtitle: titleSchema,

    series: z.array(z.object({
      name: z.string().optional(),
      data: z.array(z.object({
        name: z.string().describe('Name of the pie slice'),
        y: z.number().describe('Value/size of the slice'),
        color: z.string().optional(),
        sliced: z.boolean().optional().describe('Whether the slice should be separated from the pie'),
      }).passthrough()).describe('Array of pie slices with names and values'),
      innerSize: z.string().optional().describe('Creates a donut chart if set (e.g., "50%")'),
    }).passthrough()).describe('Pie chart series (typically only one series)'),

    plotOptions: z.record(z.string(), z.unknown()).optional(),
    tooltip: tooltipSchema,
    legend: legendSchema,

    colors: z.array(z.string()).optional(),
    credits: z.object({ enabled: z.boolean().optional() }).optional(),

  }).passthrough();
};

/**
 * General purpose schema for advanced/custom chart types
 * More permissive to handle various data formats
 */
const createAdvancedChartSchema = () => {
  const { titleSchema, axisSchema, tooltipSchema, legendSchema } = createCommonSchemas();

  return z.object({
    chart: z.object({
      type: z.enum([
        'heatmap', 'treemap', 'sankey', 'funnel', 'pyramid', 'gauge',
        'solidgauge', 'waterfall', 'boxplot', 'candlestick', 'ohlc',
        'areasplinerange', 'arearange', 'columnrange', 'packedbubble'
      ]).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      backgroundColor: z.string().optional(),
      animation: z.boolean().optional(),
    }).passthrough().optional(),

    title: titleSchema,
    subtitle: titleSchema,

    xAxis: z.union([axisSchema, z.array(axisSchema)]).optional(),
    yAxis: z.union([axisSchema, z.array(axisSchema)]).optional(),

    series: z.array(z.object({
      name: z.string().optional(),
      data: z.union([
        z.array(z.number()).describe('Simple numeric values'),
        z.array(z.array(z.number())).describe('Array of coordinate arrays (format depends on chart type)'),
        z.array(z.object({
          x: z.number().optional(),
          y: z.number().optional(),
          z: z.number().optional(),
          value: z.number().optional(),
          low: z.number().optional(),
          high: z.number().optional(),
          open: z.number().optional(),
          close: z.number().optional(),
          name: z.string().optional(),
          color: z.string().optional(),
        }).passthrough()).describe('Array of data point objects with various properties'),
      ]).optional().describe('Data format varies by chart type - see Highcharts documentation'),
      color: z.string().optional(),
    }).passthrough()).optional(),

    plotOptions: z.record(z.string(), z.unknown()).optional(),
    tooltip: tooltipSchema,
    legend: legendSchema,
    colorAxis: z.record(z.string(), z.unknown()).optional(),

    colors: z.array(z.string()).optional(),
    credits: z.object({ enabled: z.boolean().optional() }).optional(),

  }).passthrough();
};

/**
 * Executes chart configuration with common defaults
 */
const executeChartConfig = async (chartOptions: any): Promise<Highcharts.Options> => {
  return {
    credits: { enabled: false },
    ...chartOptions,
  };
};

/**
 * AI SDK tools for generating Highcharts configurations
 * Organized by chart category for better AI understanding
 */
export const highchartsTools = {
  /**
   * Line and Area Charts - for trends over time
   */
  generateLineChart: tool({
    description: 'Generate a line or spline chart. Best for showing trends over time or continuous data. Uses simple numeric arrays for data.',
    inputSchema: z.object({
      chartOptions: createBasicChartSchema('line'),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  generateAreaChart: tool({
    description: 'Generate an area or areaspline chart. Best for showing volume, cumulative values, or emphasizing magnitude of change over time.',
    inputSchema: z.object({
      chartOptions: createBasicChartSchema('area'),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  /**
   * Column and Bar Charts - for comparisons
   */
  generateColumnChart: tool({
    description: 'Generate a column (vertical bar) chart. Best for comparing values across categories, especially with many data points.',
    inputSchema: z.object({
      chartOptions: createBasicChartSchema('column'),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  generateBarChart: tool({
    description: 'Generate a bar (horizontal) chart. Best for comparing values across categories, especially when category names are long.',
    inputSchema: z.object({
      chartOptions: createBasicChartSchema('bar'),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  /**
   * Scatter and Bubble Charts - for distributions and correlations
   */
  generateScatterChart: tool({
    description: 'Generate a scatter plot. Best for showing distribution, correlation, or relationship between two variables. Uses [x, y] coordinate pairs.',
    inputSchema: z.object({
      chartOptions: createScatterChartSchema('scatter'),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  generateBubbleChart: tool({
    description: 'Generate a bubble chart. Like scatter plots but with a third dimension shown as bubble size. Uses [x, y, z] coordinates where z is bubble size.',
    inputSchema: z.object({
      chartOptions: createScatterChartSchema('bubble'),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  /**
   * Pie Charts - for proportions
   */
  generatePieChart: tool({
    description: 'Generate a pie or donut chart. Best for showing proportions and percentages of a whole. Use innerSize to create a donut chart.',
    inputSchema: z.object({
      chartOptions: createPieChartSchema(),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),

  /**
   * Advanced/Custom Charts
   */
  generateAdvancedChart: tool({
    description: 'Generate advanced chart types: heatmap, treemap, sankey, funnel, gauge, waterfall, candlestick, OHLC, etc. Refer to Highcharts documentation for specific data formats.',
    inputSchema: z.object({
      chartOptions: createAdvancedChartSchema(),
    }),
    execute: async ({ chartOptions }) => executeChartConfig(chartOptions),
  }),
};
