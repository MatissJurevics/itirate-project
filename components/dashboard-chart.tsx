"use client"

import * as React from "react"
import type Highcharts from "highcharts"
import "@/lib/charts/init-highcharts"
import type { ChartType } from "@/lib/charts/types"
import { buildChartOptions } from "@/lib/charts/chart-factory"
import { useChartHeight } from "@/hooks/use-chart-height"
import { useMapData } from "@/hooks/use-map-data"
import { useHighchartsChart } from "@/hooks/use-highcharts-chart"
import { useCopyChartToClipboard } from "@/hooks/use-copy-chart"
import { Copy, Check } from "lucide-react"

/**
 * Clean chart options by removing invalid function references
 * This is needed because functions get lost during JSON serialization/deserialization
 */
function cleanChartConfig(config: Highcharts.Options): Highcharts.Options {
  if (!config || typeof config !== 'object') {
    return config
  }

  // Deep clone to avoid mutating the original
  let cleaned: any
  try {
    cleaned = JSON.parse(JSON.stringify(config)) as any
  } catch (error) {
    console.warn('Failed to deep clone chart config:', error)
    cleaned = { ...config } as any
  }

  // Recursively remove any formatter/callback properties that aren't functions
  function removeInvalidFunctions(obj: any, path = ''): void {
    if (!obj || typeof obj !== 'object') {
      return
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (item && typeof item === 'object') {
          removeInvalidFunctions(item, `${path}[${index}]`)
        }
      })
      return
    }

    // Handle objects
    Object.keys(obj).forEach((key) => {
      const value = obj[key]
      const currentPath = path ? `${path}.${key}` : key

      // Remove formatter/callback properties that aren't functions
      if ((key.includes('formatter') || key.includes('callback')) && typeof value !== 'function') {
        if (value !== null && value !== undefined) {
          delete obj[key]
        }
      }

      // Recursively clean nested objects and arrays
      if (value && typeof value === 'object') {
        removeInvalidFunctions(value, currentPath)
      }
    })
  }

  removeInvalidFunctions(cleaned)
  return cleaned as Highcharts.Options
}

interface DashboardChartProps {
  type?: ChartType
  data?: any
  title?: string
  categories?: string[]
  height?: number | string
  mapData?: any
  mapType?: string
  projection?: string
  highchartsConfig?: Highcharts.Options
  showCopyButton?: boolean
}

export const DashboardChart = React.forwardRef<any, DashboardChartProps>(function DashboardChart({
  type,
  data,
  title,
  categories,
  height = 350,
  mapData,
  mapType,
  projection,
  highchartsConfig,
  showCopyButton = true,
}, chartInstanceRef) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  const chartHeight = useChartHeight(containerRef, height)
  const loadedMapData = useMapData(type, mapType, mapData, highchartsConfig)

  // Build chart options
  const options: Highcharts.Options = React.useMemo(() => {
    // If highchartsConfig is provided, use it directly (with height override for responsiveness)
    if (highchartsConfig) {
      // Clean the config first to remove any invalid function references from database storage
      const cleanedConfig = cleanChartConfig(highchartsConfig)
      
      const config: Highcharts.Options = {
        ...cleanedConfig,
        chart: {
          ...cleanedConfig.chart,
          height: chartHeight,
          width: null, // Auto-resize to container width
        },
        title: {
          text: undefined, // Hide title - it's shown in the widget header
        },
      }

      // Inject loaded map data into series if available and not already present
      if (loadedMapData && config.series) {
        config.series = config.series.map((series: any) => {
          // Only inject mapData if series doesn't already have it
          if ((series.type === "map" || series.type === "mapbubble") && !series.mapData) {
            return {
              ...series,
              mapData: loadedMapData,
            }
          }
          return series
        })
      }

      // Inject projection if provided and not already in config
      if (projection && !config.mapView?.projection) {
        config.mapView = {
          ...config.mapView,
          projection: {
            name: projection as any,
          },
        }
      }

      return config
    }

    // Otherwise, use the factory to build options
    if (!type) {
      throw new Error("Either 'type' or 'highchartsConfig' must be provided")
    }

    return buildChartOptions({
      type,
      data,
      title: undefined, // Hide title - it's shown in the widget header
      categories,
      height: chartHeight,
      mapData,
      mapType,
      projection,
      loadedMapData,
    })
  }, [highchartsConfig, type, data, title, categories, chartHeight, mapData, mapType, projection, loadedMapData])

  // Create and manage chart instance
  const internalChartInstanceRef = useHighchartsChart(containerRef, options, type, loadedMapData, highchartsConfig)
  const { copyChartToClipboard, isCopying, copySuccess } = useCopyChartToClipboard(internalChartInstanceRef)

  // Expose chart instance via forwarded ref
  // Use useImperativeHandle to expose the chart instance
  React.useImperativeHandle(chartInstanceRef, () => internalChartInstanceRef.current, [])
  
  // Also directly sync the ref for compatibility (some refs might not work with useImperativeHandle)
  React.useEffect(() => {
    if (chartInstanceRef && typeof chartInstanceRef === 'object' && 'current' in chartInstanceRef) {
      (chartInstanceRef as React.MutableRefObject<any>).current = internalChartInstanceRef.current
    }
  })

  const handleCopy = React.useCallback(async () => {
    await copyChartToClipboard()
  }, [copyChartToClipboard])

  return (
    <div 
      className="relative w-full h-full min-w-0 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={containerRef} className="w-full h-full min-w-0 overflow-hidden" />
      {showCopyButton && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          disabled={isCopying}
          className={`absolute top-2 right-2 z-[100] px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg ${
            isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ zIndex: 100 }}
          title="Copy chart to clipboard"
          aria-label="Copy chart to clipboard"
        >
          {isCopying ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Copying...</span>
            </>
          ) : copySuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  )
})
