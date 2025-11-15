"use client"

import * as React from "react"
import Highcharts from "highcharts"
import { Chart } from "@highcharts/react"

// Pie charts are included in Highcharts core, no module needed

type ChartType = "line" | "bar" | "pie"

interface DashboardChartProps {
  type: ChartType
  data: any // The data must match the Highcharts series/data format for each chart type
  title?: string
  categories?: string[]
  height?: number | string
}

// Stripe-inspired color palette
const STRIPE_COLORS = [
  "#635BFF", // Stripe purple
  "#00D4FF", // Stripe cyan
  "#7B68EE", // Purple variant
  "#00D9FF", // Light cyan
  "#5469D4", // Blue
  "#0EA5E9", // Sky blue
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
]

export function DashboardChart({
  type,
  data,
  title,
  categories,
  height = 350,
}: DashboardChartProps) {
  // Determine chart options based on type
  const options: Highcharts.Options = React.useMemo(() => {
    const base: Highcharts.Options = {
      chart: {
        type: type === "bar" ? "column" : type,
        height,
        backgroundColor: "transparent",
        spacing: [20, 20, 20, 20],
        animation: {
          duration: 750,
        },
        style: {
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
      },
      colors: STRIPE_COLORS,
      title: {
        text: title || "",
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
          animation: {
            duration: 750,
          },
        },
      },
    }

    if (type === "pie") {
      // Expect data to be [{ name: string, y: number }, ...]
      base.series = [
        {
          type: "pie",
          data,
          showInLegend: true,
          innerSize: "40%",
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
      ]
      base.tooltip = {
        ...base.tooltip,
        pointFormat: '<div style="text-align: center;"><b style="font-size: 14px;">{point.name}</b><br/><span style="font-size: 16px; color: #635BFF; font-weight: 600;">{point.y}</span> ({point.percentage:.1f}%)</div>',
      }
      base.plotOptions = {
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
      }
    } else if (type === "bar") {
      // "bar" (which is "column" in Highcharts lingo)
      if (categories) {
        base.xAxis = {
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
        }
      }
      base.series = (Array.isArray(data) ? data : []).map((series: any, index: number) => ({
        ...series,
        color: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, STRIPE_COLORS[index % STRIPE_COLORS.length]],
            [1, Highcharts.color(STRIPE_COLORS[index % STRIPE_COLORS.length]).setOpacity(0.7).get("rgba") as string],
          ],
        },
        borderRadius: 4,
        borderWidth: 0,
        states: {
          hover: {
            brightness: 0.1,
          },
        },
      }))
      base.yAxis = {
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
      }
      base.plotOptions = {
        ...base.plotOptions,
        column: {
          dataLabels: {
            enabled: false,
          },
          pointPadding: 0.15,
          groupPadding: 0.1,
        },
      }
      base.tooltip = {
        ...base.tooltip,
        shared: false,
        pointFormat: '<div style="text-align: center;"><b>{point.y}</b></div>',
      }
    } else {
      // "line"
      if (categories) {
        base.xAxis = {
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
        }
      }
      base.series = (Array.isArray(data) ? data : []).map((series: any, index: number) => ({
        ...series,
        color: STRIPE_COLORS[index % STRIPE_COLORS.length],
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
          lineWidth: 2,
          lineColor: "#FFFFFF",
          fillColor: STRIPE_COLORS[index % STRIPE_COLORS.length],
          states: {
            hover: {
              radius: 6,
              lineWidth: 3,
            },
          },
        },
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(STRIPE_COLORS[index % STRIPE_COLORS.length]).setOpacity(0.25).get("rgba") as string],
            [1, Highcharts.color(STRIPE_COLORS[index % STRIPE_COLORS.length]).setOpacity(0).get("rgba") as string],
          ],
        },
        states: {
          hover: {
            lineWidth: 4,
          },
        },
      }))
      base.yAxis = {
        title: { text: "" },
        gridLineColor: "#F3F4F6",
        lineColor: "#E5E7EB",
        lineWidth: 1,
        tickColor: "#E5E7EB",
        crosshair: {
          width: 1,
          color: "#E5E7EB",
          dashStyle: "Dash",
        },
        labels: {
          style: {
            color: "#6B7280",
            fontSize: "12px",
          },
        },
      }
      if (base.xAxis && typeof base.xAxis !== "undefined" && !Array.isArray(base.xAxis)) {
        base.xAxis.crosshair = {
          width: 1,
          color: "#E5E7EB",
          dashStyle: "Dash",
        }
      }
      base.plotOptions = {
        ...base.plotOptions,
        line: {
          dataLabels: {
            enabled: false,
          },
        },
        area: {
          fillOpacity: 0.4,
        },
      }
      base.tooltip = {
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
      }
    }

    return base
  }, [type, data, title, categories, height])

  return (
    <div>
      <Chart highcharts={Highcharts} options={options} />
    </div>
  )
}

// Example sample data (as JSON objects) for 3 different widgets.
// These objects can be stored in a jsonb array column in your database.

/*
[
  {
    "widgetType": "pie",
    "title": "User Distribution by Department",
    "data": [
      { "name": "Engineering", "y": 45 },
      { "name": "Marketing", "y": 26 },
      { "name": "Sales", "y": 15 },
      { "name": "HR", "y": 8 },
      { "name": "Finance", "y": 6 }
    ]
  },
  {
    "widgetType": "line",
    "title": "Monthly Active Users",
    "categories": [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ],
    "data": [
      {
        "name": "Active Users",
        "data": [120, 135, 150, 170, 165, 180, 190, 210, 200, 185, 170, 155]
      }
    ]
  },
  {
    "widgetType": "bar",
    "title": "Ticket Status Overview",
    "categories": ["Open", "Closed", "Pending", "Escalated"],
    "data": [
      {
        "name": "Tickets",
        "data": [34, 57, 29, 14]
      }
    ]
  }
]
*/


