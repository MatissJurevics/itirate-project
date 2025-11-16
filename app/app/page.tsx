"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip } from "lucide-react"
import { useRef, ChangeEvent, useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { DashboardChart } from "@/components/dashboard-chart"
import { adaptChartData, type ChartApiResponse } from "@/lib/charts/adapter"

interface Dashboard {
  id: string
  title: string
  widgets?: any[]
  created_at?: string
}

interface Widget {
  data?: any
  title?: string
  type?: string
  widgetType?: string
  categories?: string[]
  mapData?: any
  mapType?: string
  highchartsConfig?: any
}

export default function Page() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("dashboards")
          .select("id, title, widgets, created_at")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Failed to fetch dashboards:", error)
          setLoading(false)
          return
        }

        if (data) {
          // Normalize widgets if needed
          const normalizedDashboards = data.map((dashboard: any) => ({
            ...dashboard,
            widgets: (dashboard.widgets || []).map((widget: any) => {
              const isApiResponseFormat =
                widget.chartId !== undefined ||
                widget.success !== undefined ||
                (widget.chartType !== undefined && widget.widgetConfig !== undefined) ||
                (widget.dataPreview !== undefined && widget.chartType !== undefined)

              if (isApiResponseFormat) {
                return adaptChartData(widget as ChartApiResponse)
              }
              return widget
            }),
          }))

          setDashboards(normalizedDashboards)
        }
      } catch (error) {
        console.error("Error fetching dashboards:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboards()
  }, [])

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-xl font-semibold">Dashboards</h1>
      </header>
      <div className="flex flex-1 flex-col overflow-auto">
        <div className="px-4 py-6 flex flex-col gap-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-muted/50 aspect-video animate-pulse"
                />
              ))}
            </div>
          ) : dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <h2 className="text-2xl font-medium text-foreground">
                What can I do for you today?
              </h2>
              <form
                className="flex flex-col gap-3 w-full max-w-2xl"
                onSubmit={(e) => {
                  e.preventDefault()
                  /* handle submit here */
                }}
              >
                <div className="relative flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Ask anything"
                    className="h-14 text-base pr-12"
                  />
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="*/*"
                    multiple={false}
                  />
                  <label
                    htmlFor="file-upload"
                    className="absolute right-2 cursor-pointer"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent"
                      aria-label="Attach file"
                      tabIndex={-1}
                    >
                      <Paperclip className="size-5" />
                    </Button>
                  </label>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((dashboard) => (
                <Link key={dashboard.id} href={`/app/${dashboard.id}`}>
                  <div className="group cursor-pointer border bg-card hover:shadow-lg transition-all duration-200 overflow-hidden h-64">
                    <div className="relative w-full h-full bg-background/50 flex items-center justify-center">
                      {dashboard.widgets && dashboard.widgets.length > 0 ? (
                        <div className="w-full h-full scale-75 origin-top-left pointer-events-none">
                          <DashboardChart
                            highchartsConfig={dashboard.widgets[0].highchartsConfig}
                            type={dashboard.widgets[0].type || dashboard.widgets[0].widgetType}
                            data={dashboard.widgets[0].data}
                            title={dashboard.widgets[0].title}
                            categories={dashboard.widgets[0].categories}
                            mapData={dashboard.widgets[0].mapData}
                            mapType={dashboard.widgets[0].mapType}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="text-4xl text-muted-foreground">📊</div>
                          <span className="text-sm text-muted-foreground">No widgets</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>
                    <div className="p-3 bg-card border-t">
                      <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {dashboard.title.replace(/\w\S*/g, (txt: string) =>
                          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                        )}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
