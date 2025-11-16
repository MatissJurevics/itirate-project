"use client"

import { AppHeader } from "@/components/app-header"
import { PageTitle } from "@/components/page-title"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardCard } from "@/components/dashboard-card"
import { adaptChartData, type ChartApiResponse } from "@/lib/charts/adapter"

interface Dashboard {
  id: string
  title: string
  widgets?: any[]
  created_at?: string
  updated_at?: string
}

export default function Page() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)

  const handleDeleteDashboard = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("dashboards")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Failed to delete dashboard:", error)
        return
      }

      // Update local state to remove the deleted dashboard
      setDashboards((prev) => prev.filter((dashboard) => dashboard.id !== id))
    } catch (error) {
      console.error("Error deleting dashboard:", error)
    }
  }

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("dashboards")
          .select("id, title, widgets, created_at, updated_at")
          .order("updated_at", { ascending: false })

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
    <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
      <AppHeader
        breadcrumbs={[
          { label: "Dashboards" }
        ]}
      />
      <PageTitle>Your Dashboards</PageTitle>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboards.map((dashboard) => (
                <DashboardCard
                  key={dashboard.id}
                  id={dashboard.id}
                  title={dashboard.title}
                  widgets={dashboard.widgets}
                  created_at={dashboard.created_at}
                  onDelete={handleDeleteDashboard}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
