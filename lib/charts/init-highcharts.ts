import Highcharts from "highcharts"

// Track module initialization state
let modulesInitialized = false
let moduleInitPromise: Promise<void> | null = null

/**
 * Initialize Highcharts modules. Returns a promise that resolves when all modules are loaded.
 * This ensures modules are available before charts are created.
 * Modules are loaded sequentially - solid-gauge requires highcharts-more to be loaded first.
 */
export function initializeHighchartsModules(): Promise<void> {
  if (modulesInitialized) {
    return Promise.resolve()
  }

  if (moduleInitPromise) {
    return moduleInitPromise
  }

  if (typeof Highcharts === "undefined" || !Highcharts || typeof Highcharts !== "object") {
    return Promise.reject(new Error("Highcharts is not available"))
  }

  // Load modules sequentially - solid-gauge requires highcharts-more to be loaded first
  moduleInitPromise = import("highcharts/highcharts-more")
    .then((HighchartsMore) => {
      const module = (HighchartsMore as any).default || HighchartsMore
      if (module && typeof module === "function") {
        (module as (highcharts: typeof Highcharts) => void)(Highcharts)
      }
      return import("highcharts/modules/solid-gauge")
    })
    .then((SolidGauge) => {
      const module = (SolidGauge as any).default || SolidGauge
      if (module && typeof module === "function") {
        (module as (highcharts: typeof Highcharts) => void)(Highcharts)
      }
      return import("highcharts/modules/map")
    })
    .then((Highmaps) => {
      const module = (Highmaps as any).default || Highmaps
      if (module && typeof module === "function") {
        (module as (highcharts: typeof Highcharts) => void)(Highcharts)
      }
    })
    .catch((error) => {
      console.warn("Failed to load Highcharts modules:", error)
    })
    .then(() => {
      modulesInitialized = true
    })

  return moduleInitPromise
}

// Auto-initialize in browser environment
if (typeof window !== "undefined") {
  initializeHighchartsModules().catch((error) => {
    console.warn("Highcharts modules initialization failed:", error)
  })
}

