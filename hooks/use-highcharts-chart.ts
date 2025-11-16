import * as React from "react"
import Highcharts from "highcharts"
import type { ChartType } from "@/lib/charts/types"
import { initializeHighchartsModules } from "@/lib/charts/init-highcharts"

export const useHighchartsChart = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: Highcharts.Options,
  type: ChartType | undefined,
  loadedMapData: any,
  highchartsConfig?: Highcharts.Options
) => {
  const chartInstanceRef = React.useRef<Highcharts.Chart | null>(null)
  const [modulesReady, setModulesReady] = React.useState(false)

  // Ensure modules are loaded before creating chart
  React.useEffect(() => {
    initializeHighchartsModules()
      .then(() => {
        setModulesReady(true)
      })
      .catch((error) => {
        console.error("Failed to initialize Highcharts modules:", error)
        // Still set ready to avoid blocking, but log the error
        setModulesReady(true)
      })
  }, [])

  React.useEffect(() => {
    if (!containerRef.current || !modulesReady) return

    // Determine chart type from highchartsConfig or type prop
    const chartType = highchartsConfig?.chart?.type || 
                     (type === "map" || type === "map-bubble" ? "map" : undefined)

    // For map charts, we need map data (unless provided in highchartsConfig)
    const isMapChart = chartType === "map"
    if (isMapChart && !loadedMapData && !highchartsConfig?.series?.[0]?.mapData) {
      return // Wait for map data to load
    }

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }

    // Create new chart instance - use mapChart for map types if available
    if (isMapChart && (Highcharts as any).mapChart) {
      // For map charts, ensure map data is in options
      const mapOptions = {
        ...options,
        chart: {
          ...(options.chart || {}),
          animation: false,
        },
        plotOptions: {
          ...(options.plotOptions || {}),
          series: {
            ...((options.plotOptions as any)?.series || {}),
            animation: false,
          },
        },
      }
      
      // Inject map data into series if not already present
      if (loadedMapData && mapOptions.series) {
        mapOptions.series = mapOptions.series.map((series: any) => {
          if ((series.type === "map" || series.type === "mapbubble") && !series.mapData) {
            return {
              ...series,
              mapData: loadedMapData,
            }
          }
          return series
        })
      }
      
      // Also set map data in chart config as fallback
      if (loadedMapData && !mapOptions.series?.some((s: any) => s.mapData)) {
        (mapOptions as any).chart = {
          ...(mapOptions.chart || {}),
          map: loadedMapData,
          animation: false,
        }
      }
      
      chartInstanceRef.current = (Highcharts as any).mapChart(containerRef.current, mapOptions)
    } else {
      const chartOptions = {
        ...options,
        chart: {
          ...(options.chart || {}),
          animation: false,
        },
        plotOptions: {
          ...(options.plotOptions || {}),
          series: {
            ...((options.plotOptions as any)?.series || {}),
            animation: false,
          },
        },
      }
      chartInstanceRef.current = Highcharts.chart(containerRef.current, chartOptions)
    }

    // Handle resize
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.reflow() // Reflow chart to fit container
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [containerRef, options, type, loadedMapData, highchartsConfig, modulesReady])

  return chartInstanceRef
}

