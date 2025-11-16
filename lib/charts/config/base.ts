import type Highcharts from "highcharts"
import { STRIPE_COLORS } from "../constants"

export const createBaseConfig = (
  chartType: string,
  title?: string,
  height?: number
): Highcharts.Options => {
  return {
    chart: {
      type: chartType as any,
      height: height,
      width: null, // Auto-resize to container width
      backgroundColor: "transparent",
      spacing: [20, 20, 20, 20],
      animation: false,
      style: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      },
    },
    colors: STRIPE_COLORS,
    title: {
      text: title ? `<div style="width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; display: block;">${title}</div>` : "",
      useHTML: true,
      style: {
        color: "#1F2937",
        fontSize: "16px",
        fontWeight: "600",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      },
      margin: 20,
      align: "left",
    },
    xAxis: undefined,
    series: [],
    credits: { enabled: false },
    legend: {
      enabled: true,
      itemStyle: {
        color: "#6B7280",
        fontSize: "13px",
        fontWeight: "400",
      },
      itemHoverStyle: {
        color: "#1F2937",
      },
      symbolRadius: 4,
      symbolPadding: 8,
      itemMarginBottom: 8,
    },
    tooltip: {
      backgroundColor: "#FFFFFF",
      borderColor: "#E5E7EB",
      borderRadius: 8,
      borderWidth: 1,
      shadow: {
        color: "rgba(0, 0, 0, 0.1)",
        offsetX: 0,
        offsetY: 4,
        opacity: 0.1,
        width: 3,
      },
      style: {
        color: "#1F2937",
        fontSize: "13px",
      },
      padding: 12,
      useHTML: true,
    },
    plotOptions: {
      series: {
        animation: false,
      },
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 768
          },
          chartOptions: {
            title: {
              style: {
                fontSize: "14px",
              },
            },
            legend: {
              itemStyle: {
                fontSize: "11px",
              },
              symbolRadius: 3,
            },
            plotOptions: {
              series: {
                dataLabels: {
                  style: {
                    fontSize: "10px",
                  },
                },
              },
            },
          },
        },
        {
          condition: {
            maxWidth: 480
          },
          chartOptions: {
            title: {
              style: {
                fontSize: "12px",
              },
              margin: 10,
            },
            legend: {
              itemStyle: {
                fontSize: "10px",
              },
              symbolRadius: 2,
              itemMarginBottom: 4,
            },
            chart: {
              spacing: [10, 10, 10, 10],
            },
          },
        },
      ],
    },
  }
}

