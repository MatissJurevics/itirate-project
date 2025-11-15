export type ChartType = 
  | "line" 
  | "bar" 
  | "pie" 
  | "donut" 
  | "area" 
  | "spline" 
  | "area-spline" 
  | "scatter" 
  | "gauge" 
  | "column" 
  | "bar-horizontal"
  | "map"
  | "map-bubble"

export type PieDataPoint = { name: string; y: number }
export type LineSeries = { name: string; data: number[] }
export type ScatterPoint = [number, number] | { x: number; y: number }
export type GaugeDataPoint = { name: string; y: number }

export type ChartData = 
  | PieDataPoint[]  // for pie/donut
  | LineSeries[]    // for line/area/spline
  | ScatterPoint[]  // for scatter
  | GaugeDataPoint[] // for gauge
  | any[]           // for bar/column/map

export interface ChartConfigProps {
  type: ChartType
  data: any
  title?: string
  categories?: string[]
  height: number
  mapData?: any
  mapType?: string
  loadedMapData?: any
}

