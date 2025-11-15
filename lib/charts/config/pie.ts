import type Highcharts from "highcharts"
import type { ChartConfigProps } from "../types"

export const createPieConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  const isDonut = props.type === "donut"
  
  return {
    ...base,
    series: [
      {
        type: "pie",
        data: props.data,
        showInLegend: true,
        innerSize: isDonut ? "50%" : "0%",
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b><br/>{point.y} ({point.percentage:.1f}%)",
          style: {
            color: "#1F2937",
            fontSize: "12px",
            fontWeight: "500",
            textOutline: "none",
          },
          distance: 15,
        },
        states: {
          hover: {
            brightness: 0.1,
            halo: {
              size: 8,
              opacity: 0.2,
            },
          },
        },
      } as Highcharts.SeriesPieOptions,
    ],
    tooltip: {
      ...base.tooltip,
      pointFormat: '<div style="text-align: center;"><b style="font-size: 14px;">{point.name}</b><br/><span style="font-size: 16px; color: #635BFF; font-weight: 600;">{point.y}</span> ({point.percentage:.1f}%)</div>',
    },
    plotOptions: {
      ...base.plotOptions,
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        borderWidth: 0,
        states: {
          hover: {
            brightness: 0.1,
          },
        },
      },
    },
  }
}

