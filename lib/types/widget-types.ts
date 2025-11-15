// Widget type definitions for dashboard charts

// Pie Chart
export type PieChartData = {
  name: string
  y: number
}

export type PieChartConfig = {
  widgetType: "pie"
  title: string
  data: PieChartData[]
}

// Donut Chart (same as Pie)
export type DonutChartData = PieChartData

export type DonutChartConfig = {
  widgetType: "donut"
  title: string
  data: DonutChartData[]
}

// Line Chart
export type LineChartSeries = {
  name: string
  data: number[]
}

export type LineChartConfig = {
  widgetType: "line"
  title: string
  categories: string[]
  data: LineChartSeries[]
}

// Area Chart
export type AreaChartSeries = {
  name: string
  data: number[]
}

export type AreaChartConfig = {
  widgetType: "area"
  title: string
  categories: string[]
  data: AreaChartSeries[]
}

// Spline Chart
export type SplineChartSeries = {
  name: string
  data: number[]
}

export type SplineChartConfig = {
  widgetType: "spline"
  title: string
  categories: string[]
  data: SplineChartSeries[]
}

// Area Spline Chart
export type AreaSplineChartSeries = {
  name: string
  data: number[]
}

export type AreaSplineChartConfig = {
  widgetType: "area-spline"
  title: string
  categories: string[]
  data: AreaSplineChartSeries[]
}

// Bar Chart
export type BarChartSeries = {
  name: string
  data: number[]
}

export type BarChartConfig = {
  widgetType: "bar"
  title: string
  categories: string[]
  data: BarChartSeries[]
}

// Bar Horizontal Chart
export type BarHorizontalChartSeries = {
  name: string
  data: number[]
}

export type BarHorizontalChartConfig = {
  widgetType: "bar-horizontal"
  title: string
  categories: string[]
  data: BarHorizontalChartSeries[]
}

// Column Chart
export type ColumnChartSeries = {
  name: string
  data: number[]
}

export type ColumnChartConfig = {
  widgetType: "column"
  title: string
  categories: string[]
  data: ColumnChartSeries[]
}

// Scatter Chart
export type ScatterChartPoint = [number, number] | { x: number, y: number }

export type ScatterChartSeries = {
  name: string
  data: ScatterChartPoint[]
}

export type ScatterChartConfig = {
  widgetType: "scatter"
  title: string
  data: ScatterChartSeries[]
}

// Gauge Chart
export type GaugeChartData = {
  name: string
  y: number
}

export type GaugeChartConfig = {
  widgetType: "gauge"
  title: string
  data: GaugeChartData[]
}

// Map Chart (Choropleth)
export type MapChartData = {
  "hc-key": string
  value: number
  name: string
}

export type MapChartConfig = {
  widgetType: "map"
  title: string
  mapType?: string
  mapData?: any // for GeoJSON/TopoJSON object if needed
  data: MapChartData[]
}

// Map Bubble Chart
export type MapBubbleChartData = {
  name: string
  lat: number
  lon: number
  z: number
}

export type MapBubbleChartConfig = {
  widgetType: "map-bubble"
  title: string
  mapType?: string
  mapData?: any
  data: MapBubbleChartData[]
}

// Union type for all chart configs
export type DashboardChartConfig =
  | PieChartConfig
  | DonutChartConfig
  | LineChartConfig
  | AreaChartConfig
  | SplineChartConfig
  | AreaSplineChartConfig
  | BarChartConfig
  | BarHorizontalChartConfig
  | ColumnChartConfig
  | ScatterChartConfig
  | GaugeChartConfig
  | MapChartConfig
  | MapBubbleChartConfig