import * as React from "react"
import type { ChartType } from "@/lib/charts/types"

export const useMapData = (
  type: ChartType | undefined,
  mapType?: string,
  mapData?: any,
  highchartsConfig?: any
): any => {
  const [loadedMapData, setLoadedMapData] = React.useState<any>(mapData)

  React.useEffect(() => {
    // Determine if this is a map chart from type or highchartsConfig
    const isMapChart = type === "map" || type === "map-bubble" || 
                       highchartsConfig?.chart?.type === "map" ||
                       highchartsConfig?.series?.some((s: any) => s.type === "map" || s.type === "mapbubble")

    // Check if map data is already in highchartsConfig series
    const hasMapDataInConfig = highchartsConfig?.series?.some(
      (series: any) => series.mapData
    )

    // If map data is already in config, don't load it
    if (hasMapDataInConfig) {
      return
    }

    // If mapData is provided directly, use it
    if (mapData) {
      setLoadedMapData(mapData)
      return
    }

    // Load map data if mapType is provided and this is a map chart
    if (isMapChart && mapType) {
      // Load map data from Highcharts map collection
      // Try TopoJSON first (preferred for projections), then fall back to GeoJSON
      const loadMapData = async () => {
        try {
          // First try TopoJSON format (supports built-in projections better)
          const topoJsonUrl = `https://code.highcharts.com/mapdata/${mapType}.topo.json`
          let response = await fetch(topoJsonUrl)
          
          if (response.ok) {
            const topoJson = await response.json()
            setLoadedMapData(topoJson)
            return
          }
          
          // Fall back to GeoJSON format
          const geoJsonUrl = `https://code.highcharts.com/mapdata/${mapType}.geo.json`
          response = await fetch(geoJsonUrl)
          
          if (response.ok) {
            const geoJson = await response.json()
            setLoadedMapData(geoJson)
          } else {
            console.warn(`Failed to load map data from ${topoJsonUrl} or ${geoJsonUrl}`)
          }
        } catch (error) {
          console.error("Error loading map data:", error)
        }
      }
      loadMapData()
    }
  }, [type, mapType, mapData, highchartsConfig])

  return loadedMapData
}

