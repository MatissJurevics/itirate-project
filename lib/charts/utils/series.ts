import Highcharts from "highcharts"
import { STRIPE_COLORS } from "../constants"

export const createGradientColor = (color: string, opacity: number = 0.7): Highcharts.GradientColorObject => ({
  linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
  stops: [
    [0, color],
    [1, Highcharts.color(color).setOpacity(opacity).get("rgba") as string],
  ],
})

export const createAreaGradient = (color: string): Highcharts.GradientColorObject => ({
  linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
  stops: [
    [0, Highcharts.color(color).setOpacity(0.25).get("rgba") as string],
    [1, Highcharts.color(color).setOpacity(0).get("rgba") as string],
  ],
})

export const getColorForIndex = (index: number): string => {
  return STRIPE_COLORS[index % STRIPE_COLORS.length]
}

