import * as React from "react"

export const useChartHeight = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  initialHeight: number | string = 350
): number => {
  const [chartHeight, setChartHeight] = React.useState(
    typeof initialHeight === "number" ? initialHeight : 350
  )

  React.useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight
        // Subtract padding (2 * 8px = 16px) to account for container padding
        const availableHeight = containerHeight - 16
        // Set a minimum height but allow it to shrink
        setChartHeight(Math.max(availableHeight, 200))
      }
    }

    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef, initialHeight])

  return chartHeight
}

