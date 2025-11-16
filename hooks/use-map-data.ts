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
    // Skip if using highchartsConfig (map data should be in the config)
    if (highchartsConfig) return

    if ((type === "map" || type === "map-bubble") && mapType && !mapData) {
      // Load map data from Highcharts map collection
      const loadMapData = async () => {
        try {
          // Construct URL for Highcharts map data
          // Format: https://code.highcharts.com/mapdata/{mapType}.geo.json
          const mapUrl = `https://code.highcharts.com/mapdata/${mapType}.geo.json`
          const response = await fetch(mapUrl)
          if (response.ok) {
            const geoJson = await response.json()
            setLoadedMapData(geoJson)
          } else {
            console.warn(`Failed to load map data from ${mapUrl}`)
          }
        } catch (error) {
          console.error("Error loading map data:", error)
        }
      }
      loadMapData()
    } else if (mapData) {
      setLoadedMapData(mapData)
    }
  }, [type, mapType, mapData, highchartsConfig])

  return loadedMapData
}

