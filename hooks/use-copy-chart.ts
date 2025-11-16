import * as React from "react"
import type Highcharts from "highcharts"

/**
 * Hook to copy Highcharts chart to clipboard as PNG image
 * Uses Highcharts' built-in exportChart method
 */
export function useCopyChartToClipboard(chartInstanceRef: React.RefObject<Highcharts.Chart | null>) {
  const [isCopying, setIsCopying] = React.useState(false)
  const [copySuccess, setCopySuccess] = React.useState(false)

  const copyChartToClipboard = React.useCallback(async () => {
    const chart = chartInstanceRef.current
    if (!chart) {
      console.warn("Chart instance not available")
      return false
    }

    // Check if exportChart method is available
    if (typeof (chart as any).exportChart !== "function") {
      console.warn("Highcharts exportChart method not available. Make sure exporting module is loaded.")
      return false
    }

    setIsCopying(true)
    setCopySuccess(false)

    try {
      // Use Highcharts' exportChart to get chart as SVG
      const svg = (chart as any).getSVG()
      
      if (!svg) {
        throw new Error("Failed to get SVG from chart")
      }

      // Convert SVG to PNG blob using canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      // Set canvas size to match chart dimensions
      const chartWidth = chart.chartWidth || 800
      const chartHeight = chart.chartHeight || 600
      canvas.width = chartWidth
      canvas.height = chartHeight

      // Create image from SVG
      const img = new Image()
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Draw SVG image on canvas
            ctx.drawImage(img, 0, 0)
            
            // Convert canvas to blob
            canvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error("Failed to create blob from canvas"))
                return
              }

              try {
                // Copy to clipboard using Clipboard API
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ])
                
                setCopySuccess(true)
                setTimeout(() => setCopySuccess(false), 2000)
                resolve()
              } catch (clipboardError) {
                console.error("Failed to copy to clipboard:", clipboardError)
                reject(clipboardError)
              } finally {
                URL.revokeObjectURL(url)
              }
            }, 'image/png', 1.0)
          } catch (error) {
            URL.revokeObjectURL(url)
            reject(error)
          }
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error("Failed to load SVG image"))
        }
        
        img.src = url
      })

      return true
    } catch (error) {
      console.error("Error copying chart to clipboard:", error)
      return false
    } finally {
      setIsCopying(false)
    }
  }, [chartInstanceRef])

  return {
    copyChartToClipboard,
    isCopying,
    copySuccess,
  }
}

