import Highcharts from "highcharts"
import HighchartsMore from "highcharts/highcharts-more"
import SolidGauge from "highcharts/modules/solid-gauge"
import Highmaps from "highcharts/modules/map"

// Initialize modules - these are functions that extend Highcharts
if (typeof Highcharts !== "undefined") {
  try {
    ;(HighchartsMore as any)(Highcharts)
    ;(SolidGauge as any)(Highcharts)
    ;(Highmaps as any)(Highcharts)
  } catch (error) {
    // Modules may not be available in all builds
    console.warn("Highcharts modules initialization failed:", error)
  }
}

