import type Highcharts from "highcharts"
import type { ChartConfigProps } from "../types"

export const createGaugeConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  const gaugeData = Array.isArray(props.data) ? props.data : [props.data]
  
  return {
    ...base,
    pane: {
      center: ["50%", "75%"],
      size: "100%",
      startAngle: -90,
      endAngle: 90,
      background: [
        {
          backgroundColor: "#F3F4F6",
          innerRadius: "60%",
          outerRadius: "100%",
          shape: "arc",
        },
      ],
    },
    yAxis: {
      min: 0,
      max: 100,
      stops: [
        [0.1, "#635BFF"],
        [0.5, "#00D4FF"],
        [0.9, "#7B68EE"],
      ],
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: undefined,
      tickAmount: 2,
      title: {
        y: -70,
        text: props.title || "",
        style: {
          fontSize: "16px",
          fontWeight: "600",
        },
      },
      labels: {
        y: 16,
        style: {
          fontSize: "14px",
        },
      },
    },
    series: gaugeData.map((item: any, index: number) => ({
      type: "solidgauge",
      name: item.name || `Series ${index + 1}`,
      data: [item.y || item],
      dataLabels: {
        format: '<div style="text-align:center"><span style="font-size:25px;font-weight:600;color:#1F2937">{y}</span><br/><span style="font-size:12px;color:#6B7280">{name}</span></div>',
        borderWidth: 0,
        y: 20,
      },
      tooltip: {
        valueSuffix: "%",
      },
    })),
    tooltip: {
      ...base.tooltip,
      pointFormat: '<div style="text-align: center;"><b>{point.name}</b><br/><span style="font-size: 16px; color: #635BFF; font-weight: 600;">{point.y}</span></div>',
    },
  }
}

