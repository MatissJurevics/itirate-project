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
      const config: Highcharts.Options = {
        ...highchartsConfig,
        chart: {
          ...highchartsConfig.chart,
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
  React.useImperativeHandle(chartInstanceRef, () => internalChartInstanceRef.current, [internalChartInstanceRef])

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
