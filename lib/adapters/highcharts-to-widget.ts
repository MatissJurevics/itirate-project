import type * as Highcharts from 'highcharts';
import type { DashboardChartConfig } from '@/lib/types/widget-types';

/**
 * Converts Highcharts configuration to dashboard widget configuration
 */
export function convertHighchartsToWidget(
  highchartsConfig: Highcharts.Options,
  chartType?: string
): DashboardChartConfig {
  const title = getTitle(highchartsConfig);
  const chartTypeFromConfig = highchartsConfig.chart?.type || chartType || 'column';

  switch (chartTypeFromConfig) {
    case 'pie':
      return convertToPieChart(highchartsConfig, title);
    
    case 'line':
    case 'spline':
      return convertToLineChart(highchartsConfig, title, chartTypeFromConfig as 'line' | 'spline');
    
    case 'area':
    case 'areaspline':
      return convertToAreaChart(highchartsConfig, title, chartTypeFromConfig === 'areaspline' ? 'area-spline' : 'area');
    
    case 'column':
      return convertToColumnChart(highchartsConfig, title);
    
    case 'bar':
      return convertToBarChart(highchartsConfig, title);
    
    case 'scatter':
      return convertToScatterChart(highchartsConfig, title);
    
    default:
      // Fallback to column chart for unsupported types
      console.warn(`Unsupported chart type: ${chartTypeFromConfig}, falling back to column chart`);
      return convertToColumnChart(highchartsConfig, title);
  }
}

function getTitle(config: Highcharts.Options): string {
  return config.title?.text || 'Chart';
}

function getCategories(config: Highcharts.Options): string[] {
  const xAxis = Array.isArray(config.xAxis) ? config.xAxis[0] : config.xAxis;
  return xAxis?.categories || [];
}

function getSeries(config: Highcharts.Options): any[] {
  return config.series || [];
}

function convertToPieChart(config: Highcharts.Options, title: string): DashboardChartConfig {
  const series = getSeries(config);
  const data: any[] = [];
  
  if (series.length > 0 && series[0].data) {
    series[0].data.forEach((point: any) => {
      if (typeof point === 'object' && 'name' in point && 'y' in point) {
        data.push({
          name: point.name,
          y: point.y
        });
      }
    });
  }

  return {
    widgetType: "pie",
    title,
    data
  };
}

function convertToLineChart(
  config: Highcharts.Options, 
  title: string,
  widgetType: 'line' | 'spline'
): DashboardChartConfig {
  const categories = getCategories(config);
  const series = getSeries(config);
  
  const data = series.map(serie => ({
    name: serie.name || 'Series',
    data: Array.isArray(serie.data) ? serie.data.map((point: any) => 
      typeof point === 'number' ? point : point.y || 0
    ) : []
  }));

  return {
    widgetType,
    title,
    categories,
    data
  };
}

function convertToAreaChart(
  config: Highcharts.Options,
  title: string,
  widgetType: 'area' | 'area-spline'
): DashboardChartConfig {
  const categories = getCategories(config);
  const series = getSeries(config);
  
  const data = series.map(serie => ({
    name: serie.name || 'Series',
    data: Array.isArray(serie.data) ? serie.data.map((point: any) => 
      typeof point === 'number' ? point : point.y || 0
    ) : []
  }));

  return {
    widgetType,
    title,
    categories,
    data
  };
}

function convertToColumnChart(config: Highcharts.Options, title: string): DashboardChartConfig {
  const categories = getCategories(config);
  const series = getSeries(config);
  
  const data = series.map(serie => ({
    name: serie.name || 'Series',
    data: Array.isArray(serie.data) ? serie.data.map((point: any) => 
      typeof point === 'number' ? point : point.y || 0
    ) : []
  }));

  return {
    widgetType: "column",
    title,
    categories,
    data
  };
}

function convertToBarChart(config: Highcharts.Options, title: string): DashboardChartConfig {
  const categories = getCategories(config);
  const series = getSeries(config);
  
  // Determine if it should be horizontal based on chart configuration
  const isHorizontal = config.chart?.inverted || config.chart?.type === 'bar';
  
  const data = series.map(serie => ({
    name: serie.name || 'Series',
    data: Array.isArray(serie.data) ? serie.data.map((point: any) => 
      typeof point === 'number' ? point : point.y || 0
    ) : []
  }));

  return {
    widgetType: isHorizontal ? "bar-horizontal" : "bar",
    title,
    categories,
    data
  };
}

function convertToScatterChart(config: Highcharts.Options, title: string): DashboardChartConfig {
  const series = getSeries(config);
  
  const data = series.map(serie => ({
    name: serie.name || 'Series',
    data: Array.isArray(serie.data) ? serie.data.map((point: any) => {
      if (Array.isArray(point) && point.length >= 2) {
        return [point[0], point[1]];
      } else if (typeof point === 'object' && 'x' in point && 'y' in point) {
        return { x: point.x, y: point.y };
      }
      return [0, 0];
    }) : []
  }));

  return {
    widgetType: "scatter",
    title,
    data
  };
}

/**
 * Utility function to extract chart type from tool name
 */
export function extractChartTypeFromToolName(toolName: string): string {
  const typeMap: Record<string, string> = {
    'generateLineChart': 'line',
    'generateColumnChart': 'column', 
    'generateBarChart': 'bar',
    'generatePieChart': 'pie',
    'generateAreaChart': 'area',
    'generateScatterChart': 'scatter',
    'generateBubbleChart': 'scatter', // Treat bubble as scatter for now
    'generateAdvancedChart': 'column' // Fallback
  };
  
  return typeMap[toolName] || 'column';
}