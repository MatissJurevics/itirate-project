import type Highcharts from "highcharts"
import type { ChartConfigProps } from "../types"
import { createXAxisWithCrosshair, createYAxisWithCrosshair } from "../utils/axis"
import { getColorForIndex, createAreaGradient } from "../utils/series"

export const createLineConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  const isArea = props.type === "area" || props.type === "area-spline"
  const isSpline = props.type === "spline" || props.type === "area-spline"
  const seriesData = Array.isArray(props.data) ? props.data : []
  
  return {
    ...base,
    xAxis: props.categories ? createXAxisWithCrosshair(props.categories) : createXAxisWithCrosshair(),
    yAxis: createYAxisWithCrosshair(),
    series: seriesData.map((series: any, index: number) => ({
      ...series,
      type: isSpline ? "spline" : "line",
      color: getColorForIndex(index),
      lineWidth: 3,
      marker: {
        enabled: true,
        radius: 4,
        lineWidth: 2,
        lineColor: "#FFFFFF",
        fillColor: getColorForIndex(index),
        states: {
          hover: {
            radius: 6,
            lineWidth: 3,
          },
        },
      },
      fillColor: isArea ? createAreaGradient(getColorForIndex(index)) : undefined,
      fillOpacity: isArea ? 0.4 : undefined,
      states: {
        hover: {
          lineWidth: 4,
        },
      },
    })),
    plotOptions: {
      ...base.plotOptions,
      line: {
        dataLabels: {
          enabled: false,
        },
      },
      area: {
        fillOpacity: 0.4,
      },
    },
    tooltip: {
      ...base.tooltip,
      shared: true,
      formatter: function(this: any) {
        let tooltip = `<div style="margin-bottom: 8px; font-weight: 600; color: #1F2937;">${this.x}</div>`
        if (this.points && Array.isArray(this.points)) {
          this.points.forEach((point: any) => {
            tooltip += `<div style="margin-bottom: 4px;"><span style="color: ${point.color}; font-weight: 600;">●</span> ${point.series.name}: <b>${point.y}</b></div>`
          })
        } else if (this.point) {
          tooltip += `<div style="margin-bottom: 4px;"><span style="color: ${this.color}; font-weight: 600;">●</span> ${this.series.name}: <b>${this.y}</b></div>`
        }
        return tooltip
      },
    },
  }
}

