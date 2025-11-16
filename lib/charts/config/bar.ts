import type Highcharts from "highcharts"
import type { ChartConfigProps } from "../types"
import { createStandardXAxis, createStandardYAxis } from "../utils/axis"
import { createGradientColor, getColorForIndex } from "../utils/series"

export const createBarConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  const seriesData = Array.isArray(props.data) ? props.data : []
  
  return {
    ...base,
    xAxis: props.categories ? createStandardXAxis(props.categories) : undefined,
    yAxis: createStandardYAxis(),
    series: seriesData.map((series: any, index: number) => ({
      ...series,
      color: createGradientColor(getColorForIndex(index)),
      borderRadius: 4,
      borderWidth: 0,
      states: {
        hover: {
          brightness: 0.1,
        },
      },
    })),
    plotOptions: {
      ...base.plotOptions,
      column: {
        dataLabels: {
          enabled: false,
        },
        pointPadding: 0.15,
        groupPadding: 0.1,
      },
    },
    tooltip: {
      ...base.tooltip,
      shared: false,
      pointFormat: '<div style="text-align: center;"><b>{point.y}</b></div>',
    },
  }
}

