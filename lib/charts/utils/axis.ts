import type Highcharts from "highcharts"

export const createStandardXAxis = (categories?: string[]): Highcharts.XAxisOptions => ({
  categories,
  lineColor: "#E5E7EB",
  lineWidth: 1,
  tickColor: "#E5E7EB",
  labels: {
    style: {
      color: "#6B7280",
      fontSize: "12px",
    },
  },
})

export const createStandardYAxis = (): Highcharts.YAxisOptions => ({
  title: { text: "" },
  gridLineColor: "#F3F4F6",
  lineColor: "#E5E7EB",
  lineWidth: 1,
  tickColor: "#E5E7EB",
  labels: {
    style: {
      color: "#6B7280",
      fontSize: "12px",
    },
  },
})

export const createXAxisWithCrosshair = (categories?: string[]): Highcharts.XAxisOptions => ({
  ...createStandardXAxis(categories),
  crosshair: {
    width: 1,
    color: "#E5E7EB",
    dashStyle: "Dash",
  },
})

export const createYAxisWithCrosshair = (): Highcharts.YAxisOptions => ({
  ...createStandardYAxis(),
  crosshair: {
    width: 1,
    color: "#E5E7EB",
    dashStyle: "Dash",
  },
})

