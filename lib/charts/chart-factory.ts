import type Highcharts from "highcharts"
import type { ChartType, ChartConfigProps } from "./types"
import { createBaseConfig } from "./config/base"
import { createPieConfig } from "./config/pie"
import { createGaugeConfig } from "./config/gauge"
import { createLineConfig } from "./config/line"
import { createBarConfig } from "./config/bar"
import { createScatterConfig } from "./config/scatter"
import { createMapConfig, createMapBubbleConfig } from "./config/map"

type ChartConfigBuilder = (
  base: Highcharts.Options,
  props: ChartConfigProps
) => Highcharts.Options

const getHighchartsChartType = (type: ChartType): string => {
  const typeMap: Record<ChartType, string> = {
    bar: "column",
    "bar-horizontal": "bar",
    "area-spline": "areaspline",
    donut: "pie",
    gauge: "solidgauge",
    map: "map",
    "map-bubble": "map",
    line: "line",
    pie: "pie",
    area: "area",
    spline: "spline",
    scatter: "scatter",
    column: "column",
  }
  return typeMap[type] || type
}

const chartBuilders: Record<ChartType, ChartConfigBuilder> = {
  pie: (base, props) => createPieConfig(base, props),
  donut: (base, props) => createPieConfig(base, props),
  line: (base, props) => createLineConfig(base, props),
  area: (base, props) => createLineConfig(base, props),
  spline: (base, props) => createLineConfig(base, props),
  "area-spline": (base, props) => createLineConfig(base, props),
  bar: (base, props) => createBarConfig(base, props),
  "bar-horizontal": (base, props) => createBarConfig(base, props),
  column: (base, props) => createBarConfig(base, props),
  scatter: (base, props) => createScatterConfig(base, props),
  gauge: (base, props) => createGaugeConfig(base, props),
  map: (base, props) => createMapConfig(base, props),
  "map-bubble": (base, props) => createMapBubbleConfig(base, props),
}

export const buildChartOptions = (props: ChartConfigProps): Highcharts.Options => {
  const chartType = getHighchartsChartType(props.type)
  const base = createBaseConfig(chartType, props.title, props.height)
  const builder = chartBuilders[props.type]
  
  if (!builder) {
    throw new Error(`Unsupported chart type: ${props.type}`)
  }
  
  return builder(base, props)
}

