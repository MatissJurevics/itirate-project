"use client"

import * as React from "react"
import type Highcharts from "highcharts"
import "@/lib/charts/init-highcharts"
import type { ChartType } from "@/lib/charts/types"
import { buildChartOptions } from "@/lib/charts/chart-factory"
import { useChartHeight } from "@/hooks/use-chart-height"
import { useMapData } from "@/hooks/use-map-data"
import { useHighchartsChart } from "@/hooks/use-highcharts-chart"

interface DashboardChartProps {
  type?: ChartType
  data?: any
  title?: string
  categories?: string[]
  height?: number | string
  mapData?: any
  mapType?: string
  highchartsConfig?: Highcharts.Options
}

function DashboardChartComponent({
  type,
  data,
  title,
  categories,
  height = 350,
  mapData,
  mapType,
  highchartsConfig,
}: DashboardChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const chartHeight = useChartHeight(containerRef, height)
  const loadedMapData = useMapData(type, mapType, mapData, highchartsConfig)

  // Build chart options
  const options: Highcharts.Options = React.useMemo(() => {
    // If highchartsConfig is provided, use it directly (with height override for responsiveness)
    if (highchartsConfig) {
      return {
        ...highchartsConfig,
      chart: {
          ...highchartsConfig.chart,
        height: chartHeight,
        width: null, // Auto-resize to container width
        },
      }
    }

    // Otherwise, use the factory to build options
    if (!type) {
      throw new Error("Either 'type' or 'highchartsConfig' must be provided")
    }

    return buildChartOptions({
      type,
      data,
      title,
      categories,
      height: chartHeight,
      mapData,
      mapType,
      loadedMapData,
    })
  }, [highchartsConfig, type, data, title, categories, chartHeight, mapData, mapType, loadedMapData])

  // Create and manage chart instance
  useHighchartsChart(containerRef, options, type, loadedMapData, highchartsConfig)

  return (
    <div ref={containerRef} className="w-full h-full min-w-0 overflow-hidden" />
  )
}

// Memoize component to prevent unnecessary re-renders
export const DashboardChart = React.memo(DashboardChartComponent, (prevProps, nextProps) => {
  // Custom comparison function for optimal re-render control
  return (
    prevProps.highchartsConfig === nextProps.highchartsConfig &&
    prevProps.type === nextProps.type &&
    prevProps.data === nextProps.data &&
    prevProps.title === nextProps.title &&
    JSON.stringify(prevProps.categories) === JSON.stringify(nextProps.categories) &&
    prevProps.mapData === nextProps.mapData &&
    prevProps.mapType === nextProps.mapType &&
    prevProps.height === nextProps.height
  )
})
