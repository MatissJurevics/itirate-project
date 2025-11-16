import type { ChartType } from "./types"
import type Highcharts from "highcharts"
import { createBaseConfig } from "./config/base"

export interface ChartApiResponse {
  chartId?: string
  success?: boolean
  chartType?: string
  totalRows?: number
  aiResponse?: string
  dataPreview?: any[]
  widgetConfig?: {
    data?: any[]
    title?: string
    widgetType?: string
    [key: string]: any
  }
  highchartsConfig?: Highcharts.Options
}

export interface ChartWidget {
  id?: string
  chartId?: string
  type?: ChartType
  data?: any
  title?: string
  categories?: string[]
  height?: number | string
  mapData?: any
  mapType?: string
  highchartsConfig?: Highcharts.Options
}

/**
 * Adapter function that converts API response format to DashboardChart-compatible format
 * 
 * Priority:
 * 1. If highchartsConfig exists, use it directly (most complete)
 * 2. Otherwise, extract from widgetConfig
 * 3. Fallback to top-level chartType and dataPreview
 */
export function adaptChartData(apiResponse: ChartApiResponse): ChartWidget {
  // If highchartsConfig is provided, normalize it to match base config styling
  if (apiResponse.highchartsConfig) {
    const apiConfig = apiResponse.highchartsConfig
    const chartType = apiConfig.chart?.type || apiResponse.chartType || "pie"
    const title = apiConfig.title?.text || apiResponse.widgetConfig?.title
    
    // Get base config to ensure consistent styling
    // Ensure height is a number or undefined (Highcharts can have string heights, but we need number)
    const height = typeof apiConfig.chart?.height === 'number' ? apiConfig.chart.height : undefined
    const baseConfig = createBaseConfig(chartType, title, height)
    
    // Merge: base config (for styling) + API config (for data/series)
    // This ensures visual consistency while preserving the API's data
    const normalizedConfig: Highcharts.Options = {
      ...baseConfig,
      ...apiConfig,
      // Override specific styling properties to match base config
      chart: {
        ...baseConfig.chart,
        ...apiConfig.chart,
        backgroundColor: baseConfig.chart?.backgroundColor || "transparent",
        spacing: baseConfig.chart?.spacing || [20, 20, 20, 20],
      },
      // Preserve API's series data but ensure styling matches
      series: apiConfig.series || baseConfig.series,
      // Merge tooltip styling
      tooltip: {
        ...baseConfig.tooltip,
        ...apiConfig.tooltip,
      },
      // Merge legend styling
      legend: {
        ...baseConfig.legend,
        ...apiConfig.legend,
      },
      // Merge title styling but preserve API's text
      title: {
        ...baseConfig.title,
        ...apiConfig.title,
        text: apiConfig.title?.text || baseConfig.title?.text,
      },
    }
    
    return {
      id: apiResponse.chartId,
      chartId: apiResponse.chartId,
      highchartsConfig: normalizedConfig,
      title: title,
    }
  }

  // Extract from widgetConfig if available
  if (apiResponse.widgetConfig) {
    const widget = apiResponse.widgetConfig
    return {
      id: apiResponse.chartId,
      chartId: apiResponse.chartId,
      type: widget.widgetType as ChartType | undefined,
      data: widget.data,
      title: widget.title,
    }
  }

  // Fallback: extract from top-level fields
  return {
    id: apiResponse.chartId,
    chartId: apiResponse.chartId,
    type: apiResponse.chartType as ChartType | undefined,
    data: apiResponse.dataPreview,
    // No title available in fallback
  }
}

/**
 * Type guard to check if the response has highchartsConfig
 */
export function hasHighchartsConfig(
  response: ChartApiResponse
): response is ChartApiResponse & { highchartsConfig: Highcharts.Options } {
  return !!response.highchartsConfig
}

/**
 * Type guard to check if the response has widgetConfig
 */
export function hasWidgetConfig(
  response: ChartApiResponse
): response is ChartApiResponse & { widgetConfig: NonNullable<ChartApiResponse['widgetConfig']> } {
  return !!response.widgetConfig && typeof response.widgetConfig === 'object'
}

