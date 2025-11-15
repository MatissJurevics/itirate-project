import type Highcharts from "highcharts"
import type { ChartConfigProps } from "../types"

export const createMapConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  return {
    ...base,
    colorAxis: {
      min: 0,
      minColor: "#E0E7FF",
      maxColor: "#635BFF",
      stops: [
        [0, "#E0E7FF"],
        [0.5, "#A5B4FC"],
        [1, "#635BFF"],
      ],
    },
    series: [
      {
        type: "map",
        name: props.title || "Value",
        data: props.data,
        mapData: props.loadedMapData || props.mapData,
        joinBy: ["hc-key", "code"] as any,
        borderColor: "#FFFFFF",
        borderWidth: 1,
        nullColor: "#F3F4F6",
        states: {
          hover: {
            brightness: 0.1,
            borderColor: "#1F2937",
            borderWidth: 2,
          },
          select: {
            color: "#8B5CF6",
          },
        },
        dataLabels: {
          enabled: false,
        },
      } as any,
    ],
    mapNavigation: {
      enabled: true,
      buttonOptions: {
        verticalAlign: "bottom",
      },
      buttons: {
        zoomIn: {
          text: "+",
        },
        zoomOut: {
          text: "-",
        },
      },
    },
    tooltip: {
      ...base.tooltip,
      pointFormat: '<div style="text-align: center;"><b style="font-size: 14px;">{point.name}</b><br/><span style="font-size: 16px; color: #635BFF; font-weight: 600;">{point.value}</span></div>',
    },
    legend: {
      ...base.legend,
      enabled: true,
      layout: "vertical",
      align: "right",
      verticalAlign: "middle",
    },
  }
}

export const createMapBubbleConfig = (
  base: Highcharts.Options,
  props: ChartConfigProps
): Highcharts.Options => {
  const mapData = props.loadedMapData || props.mapData
  
  return {
    ...base,
    series: [
      {
        type: "map",
        name: "Base Map",
        mapData: mapData,
        data: mapData?.features?.map((feature: any) => ({
          name: feature.properties?.name || feature.properties?.NAME || feature.properties?.hc_a2 || feature.properties?.hc_key,
          geometry: feature.geometry,
        })) || [],
        joinBy: null,
        nullColor: "#F3F4F6",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        states: {
          hover: {
            color: "#E0E7FF",
          },
        },
        dataLabels: {
          enabled: false,
        },
      } as any,
      {
        type: "mapbubble",
        name: props.title || "Values",
        data: props.data,
        minSize: 10,
        maxSize: 50,
        color: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, "#635BFF"],
            [1, "#00D4FF"],
          ],
        },
        borderColor: "#FFFFFF",
        borderWidth: 2,
        tooltip: {
          pointFormat: '<div style="text-align: center;"><b style="font-size: 14px;">{point.name}</b><br/><span style="font-size: 16px; color: #635BFF; font-weight: 600;">{point.z}</span></div>',
        },
        states: {
          hover: {
            brightness: 0.1,
            borderWidth: 3,
          },
        },
      } as any,
    ],
    mapNavigation: {
      enabled: true,
      buttonOptions: {
        verticalAlign: "bottom",
      },
      buttons: {
        zoomIn: {
          text: "+",
        },
        zoomOut: {
          text: "-",
        },
      },
    },
    tooltip: {
      ...base.tooltip,
      shared: false,
    },
    legend: {
      ...base.legend,
      enabled: true,
      layout: "vertical",
      align: "right",
      verticalAlign: "middle",
    },
  }
}

