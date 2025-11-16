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
  projection?: string
  highchartsConfig?: Highcharts.Options
}

export function DashboardChart({
  type,
  data,
  title,
  categories,
  height = 350,
  mapData,
  mapType,
  projection,
  highchartsConfig,
}: DashboardChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
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
  useHighchartsChart(containerRef, options, type, loadedMapData, highchartsConfig)

  return (
    <div ref={containerRef} className="w-full h-full min-w-0 overflow-hidden" />
  )
}
