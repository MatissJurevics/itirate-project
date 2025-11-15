import type Highcharts from "highcharts"
import type { ChartConfigProps } from "../types"
import { createStandardXAxis, createStandardYAxis } from "../utils/axis"
import { getColorForIndex } from "../utils/series"

export const createScatterConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  const seriesData = Array.isArray(props.data) ? props.data : []
  
  return {
    ...base,
    xAxis: createStandardXAxis(),
    yAxis: createStandardYAxis(),
    series: seriesData.map((series: any, index: number) => ({
      ...series,
      type: "scatter",
      color: getColorForIndex(index),
      marker: {
        enabled: true,
        radius: 5,
        lineWidth: 2,
        lineColor: "#FFFFFF",
        fillColor: getColorForIndex(index),
        states: {
          hover: {
            radius: 7,
            lineWidth: 3,
          },
        },
      },
    })),
    tooltip: {
      ...base.tooltip,
      shared: false,
      pointFormat: '<div style="text-align: center;">X: <b>{point.x}</b><br/>Y: <b>{point.y}</b></div>',
    },
  }
}

