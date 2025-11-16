import * as React from "react"
import Highcharts from "highcharts"
import type { ChartType } from "@/lib/charts/types"
import { initializeHighchartsModules } from "@/lib/charts/init-highcharts"

/**
 * Clean chart options by removing invalid function references
 * Functions get lost during JSON serialization/deserialization, so we need to remove
 * properties that should be functions but are strings/null/undefined
 */
function cleanChartOptions(options: Highcharts.Options): Highcharts.Options {
  if (!options || typeof options !== 'object') {
    return options
  }

  // Deep clone to avoid mutating the original
  // Use a try-catch to handle circular references or other serialization issues
  let cleaned: any
  try {
    cleaned = JSON.parse(JSON.stringify(options)) as any
  } catch (error) {
    // If serialization fails, try a shallow clone approach
    console.warn('Failed to deep clone chart options, using shallow clone:', error)
    cleaned = { ...options } as any
  }

  // Remove invalid formatter functions from tooltip
  if (cleaned.tooltip) {
    if (typeof cleaned.tooltip.formatter !== 'function') {
      delete cleaned.tooltip.formatter
    }
    // Also check for pointFormatter
    if (typeof cleaned.tooltip.pointFormatter !== 'function') {
      delete cleaned.tooltip.pointFormatter
    }
  }

  // Remove invalid formatter functions from plotOptions
  if (cleaned.plotOptions) {
    Object.keys(cleaned.plotOptions).forEach((key) => {
      const plotOption = cleaned.plotOptions[key]
      if (plotOption && typeof plotOption === 'object') {
        // Remove invalid formatters from series-level plotOptions
        if (typeof plotOption.dataLabels?.formatter !== 'function') {
          if (plotOption.dataLabels) {
            delete plotOption.dataLabels.formatter
          }
        }
        if (typeof plotOption.tooltip?.formatter !== 'function') {
          if (plotOption.tooltip) {
            delete plotOption.tooltip.formatter
          }
        }
      }
    })
  }

  // Clean series array
  if (Array.isArray(cleaned.series)) {
    cleaned.series = cleaned.series.map((series: any) => {
      if (series && typeof series === 'object') {
        // Remove invalid formatters from series
        if (typeof series.dataLabels?.formatter !== 'function') {
          if (series.dataLabels) {
            delete series.dataLabels.formatter
          }
        }
        if (typeof series.tooltip?.formatter !== 'function') {
          if (series.tooltip) {
            delete series.tooltip.formatter
          }
        }
        // Remove any other function-like properties that aren't actually functions
        Object.keys(series).forEach((key) => {
          if ((key.includes('formatter') || key.includes('callback')) && typeof series[key] !== 'function') {
            // Only delete if it's not null/undefined (those are valid)
            if (series[key] !== null && series[key] !== undefined) {
              delete series[key]
            }
          }
        })
        // Also clean nested objects in series
        if (series.data && Array.isArray(series.data)) {
          series.data = series.data.map((dataPoint: any) => {
            if (dataPoint && typeof dataPoint === 'object') {
              Object.keys(dataPoint).forEach((key) => {
                if ((key.includes('formatter') || key.includes('callback')) && typeof dataPoint[key] !== 'function') {
                  if (dataPoint[key] !== null && dataPoint[key] !== undefined) {
                    delete dataPoint[key]
                  }
                }
              })
            }
            return dataPoint
          })
        }
      }
      return series
    })
  }

  // Clean xAxis and yAxis arrays
  ['xAxis', 'yAxis'].forEach((axisKey) => {
    if (Array.isArray(cleaned[axisKey])) {
      cleaned[axisKey] = cleaned[axisKey].map((axis: any) => {
        if (axis && typeof axis === 'object') {
          if (typeof axis.labels?.formatter !== 'function') {
            if (axis.labels) {
              delete axis.labels.formatter
            }
          }
          if (typeof axis.title?.style !== 'function') {
            // style can be an object, so we only remove if it's not an object
            if (axis.title && typeof axis.title.style !== 'object' && typeof axis.title.style !== 'function') {
              delete axis.title.style
            }
          }
        }
        return axis
      })
    } else if (cleaned[axisKey] && typeof cleaned[axisKey] === 'object') {
      const axis = cleaned[axisKey]
      if (typeof axis.labels?.formatter !== 'function') {
        if (axis.labels) {
          delete axis.labels.formatter
        }
      }
    }
  })

  // Clean legend
  if (cleaned.legend && typeof cleaned.legend === 'object') {
    if (typeof cleaned.legend.labelFormatter !== 'function') {
      delete cleaned.legend.labelFormatter
    }
  }

  return cleaned as Highcharts.Options
}

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

    // Clean options to remove invalid function references
    const cleanedOptions = cleanChartOptions(options)

    // Create new chart instance - use mapChart for map types if available
    if (isMapChart && (Highcharts as any).mapChart) {
      // For map charts, ensure map data is in options
      const mapOptions = {
        ...cleanedOptions,
        chart: {
          ...(cleanedOptions.chart || {}),
          animation: false,
        },
        plotOptions: {
          ...(cleanedOptions.plotOptions || {}),
          series: {
            ...((cleanedOptions.plotOptions as any)?.series || {}),
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
      
      try {
        chartInstanceRef.current = (Highcharts as any).mapChart(containerRef.current, mapOptions)
      } catch (error) {
        console.error('Error creating map chart:', error)
        throw error
      }
    } else {
      const chartOptions = {
        ...cleanedOptions,
        chart: {
          ...(cleanedOptions.chart || {}),
          animation: false,
        },
        plotOptions: {
          ...(cleanedOptions.plotOptions || {}),
          series: {
            ...((cleanedOptions.plotOptions as any)?.series || {}),
            animation: false,
          },
        },
      }
      
      try {
        chartInstanceRef.current = Highcharts.chart(containerRef.current, chartOptions)
      } catch (error) {
        console.error('Error creating chart:', error)
        console.error('Chart options:', JSON.stringify(chartOptions, null, 2))
        throw error
      }
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

// Export chart instance type for use in other hooks
export type ChartInstanceRef = React.RefObject<Highcharts.Chart | null>

