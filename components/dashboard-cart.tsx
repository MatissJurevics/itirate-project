"use client"

import * as React from "react"
import Highcharts from "highcharts"
import { Chart as HighchartsReact } from "@highcharts/react"
// Note: Pie charts are included in the main Highcharts package by default

type ChartType = "line" | "bar" | "pie"

interface DashboardChartProps {
  type: ChartType
  data: any // The data must match the Highcharts series/data format for each chart type
  title?: string
  categories?: string[]
  height?: number | string
}

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
      },
      title: {
        text: title || "",
      },
      xAxis: undefined,
      series: [],
      credits: { enabled: false },
      legend: { enabled: true },
      tooltip: {},
      plotOptions: {},
    }

    if (type === "pie") {
      // Expect data to be [{ name: string, y: number }, ...]
      base.series = [
        {
          type: "pie",
          data,
          showInLegend: true,
        } as Highcharts.SeriesPieOptions,
      ]
      base.tooltip = {
        pointFormat: "<b>{point.percentage:.1f}%</b>",
      }
      base.plotOptions = {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: { enabled: true, format: "<b>{point.name}</b>: {point.y}" },
        },
      }
    } else {
      // "line" or "bar" (which is "column" in Highcharts lingo)
      if (categories) {
        base.xAxis = { categories }
      }
      // Expect data to be [{ name: string, data: number[] }, ...]
      base.series = Array.isArray(data) ? data : []
      base.yAxis = { title: { text: "" } }
      base.plotOptions = {
        [type === "bar" ? "column" : "line"]: {
          dataLabels: {
            enabled: true,
          },
        },
      }
    }

    return base
  }, [type, data, title, categories, height])

  return (
    <div>
      <HighchartsReact highcharts={Highcharts} options={options} />
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


