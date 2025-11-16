"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { EditHeader } from "@/components/edit-header"
import { ChatSidebar } from "@/components/chat-sidebar"
import { createClient } from "@/lib/supabase/client"
import { DashboardChart } from "@/components/dashboard-chart"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, ChevronDown, ChevronUp } from "lucide-react"
import { adaptChartData, type ChartApiResponse } from "@/lib/charts/adapter"
import type { ChartType } from "@/lib/charts/types"

interface PageContentProps {
  id: string
}

interface Widget {
  data?: any;
  title?: string;
  type?: ChartType;
  widgetType?: ChartType; // For backward compatibility
  categories?: string[];
  mapData?: any;
  mapType?: string;
  highchartsConfig?: any;
}

export function PageContent({ id }: PageContentProps) {
  const searchParams = useSearchParams()

  // New: values from the URL for the “direct /app” route
  const initialPrompt = searchParams.get("prompt") || ""
  const fileName = searchParams.get("fileName") || ""
  const rowCount = searchParams.get("rows") || ""
  // Assuming id is your csvId when you come from the upload / info flow
  const csvId = id

  const [isChatOpen, setIsChatOpen] = React.useState(false)
  const [isTranscriptOpen, setIsTranscriptOpen] = React.useState(false)
  const [dashboard, setDashboard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)
  const [isAudioBarCollapsed, setIsAudioBarCollapsed] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    const loadDashboard = async () => {
      const storageKey = `dashboard_${id}`
      const cachedData = localStorage.getItem(storageKey)

      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData)
          if (parsedData && parsedData.id === id) {
            const normalizedData = {
              ...parsedData,
              widgets: (parsedData.widgets || []).map((widget: any) => {
                const isApiResponseFormat =
                  (widget.chartId !== undefined || widget.success !== undefined) ||
                  (widget.chartType !== undefined && widget.widgetConfig !== undefined) ||
                  (widget.dataPreview !== undefined && widget.chartType !== undefined)

                if (isApiResponseFormat) {
                  return adaptChartData(widget as ChartApiResponse)
                }
                return widget
              })
            }
            setDashboard(normalizedData)
            setLoading(false)

            fetchAndUpdateDashboard(storageKey)
            return
          }
        } catch (error) {
          console.warn("Failed to parse cached dashboard data:", error)
          localStorage.removeItem(storageKey)
        }
      }

      setLoading(true)
      await fetchAndUpdateDashboard(storageKey)
    }

    const fetchAndUpdateDashboard = async (storageKey: string) => {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("dashboards")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          console.error("Failed to fetch dashboard:", error)
          setDashboard(null)
          setLoading(false)
          return
        }

        const normalizedData = {
          ...data,
          widgets: (data.widgets || []).map((widget: any) => {
            const isApiResponseFormat =
              (widget.chartId !== undefined || widget.success !== undefined) ||
              (widget.chartType !== undefined && widget.widgetConfig !== undefined) ||
              (widget.dataPreview !== undefined && widget.chartType !== undefined)

            if (isApiResponseFormat) {
              return adaptChartData(widget as ChartApiResponse)
            }

            return widget
          })
        }

        try {
          localStorage.setItem(storageKey, JSON.stringify(normalizedData))
        } catch (storageError) {
          console.warn("Failed to save dashboard to localStorage:", storageError)
        }

        setDashboard(normalizedData)
      } catch (error) {
        console.error("Error fetching dashboard:", error)
        setDashboard(null)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [id])

  const audioUrl = dashboard?.audio || null
  const transcript = dashboard?.transcript || null

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div
        className={`flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isAudioBarCollapsed ? "pb-0" : "pb-16"
        }`}
      >
        <EditHeader
          name={dashboard?.title}
          onChatOpen={() => setIsChatOpen(true)}
        />

        {/* Optional: Dataset info header only when URL provides info */}
        {(fileName || rowCount || initialPrompt) && (
          <div className="px-4 pt-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-lg font-semibold mb-2">Dataset Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">File:</span>
                  <span className="ml-2 font-medium">
                    {fileName || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rows:</span>
                  <span className="ml-2 font-medium">
                    {rowCount || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Table:</span>
                  <span className="ml-2 font-mono text-xs bg-muted px-2 py-1 rounded">
                    csv_to_table.csv_{csvId}
                  </span>
                </div>
              </div>
              {initialPrompt && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground">Initial Prompt:</span>
                  <p className="mt-1 text-sm italic">{initialPrompt}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && dashboard?.title && (
          <div className="px-4 pt-4 pb-2">
            <h1 className="text-2xl font-semibold">
              {dashboard.title.replace(
                /\w\S*/g,
                (txt: string) =>
                  txt.charAt(0).toUpperCase() +
                  txt.substr(1).toLowerCase()
              )}
            </h1>
            <div className="h-px bg-border mt-2 mb-4" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-y-auto">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {loading && !dashboard ? (
              <>
                <div className="bg-muted/50 aspect-video animate-pulse" />
                <div className="bg-muted/50 aspect-video animate-pulse" />
                <div className="bg-muted/50 aspect-video animate-pulse" />
              </>
            ) : dashboard && dashboard.widgets && dashboard.widgets.length > 0 ? (
              dashboard.widgets.map((widget: Widget, idx: number) => (
                <div
                  className="bg-muted/50 aspect-video flex items-center justify-center p-2 w-full min-w-0 overflow-hidden h-full"
                  key={idx}
                >
                  <DashboardChart
                    highchartsConfig={widget.highchartsConfig}
                    type={widget.type || widget.widgetType}
                    data={widget.data}
                    title={widget.title}
                    categories={widget.categories}
                    mapData={widget.mapData}
                    mapType={widget.mapType}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-3 flex items-center justify-center text-muted-foreground">
                No widgets to display.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Bar - Collapsible with slide animation */}
      <div
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
          isAudioBarCollapsed ? "bottom-[-64px]" : "bottom-0"
        }`}
      >
        <div className="border-t bg-background px-4 py-3 flex items-center gap-4">
          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="flex-1 h-8"
            />
          ) : (
            <div className="flex-1 h-8 bg-muted rounded border border-border flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                No audio available
              </span>
            </div>
          )}
          {transcript && (
            <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <FileText className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Transcript</DialogTitle>
                  <DialogDescription>
                    View the transcript for this dashboard
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {transcript}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAudioBarCollapsed(!isAudioBarCollapsed)}
            className="h-8 w-8"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Collapse audio player</span>
          </Button>
        </div>

        {/* Floating button to expand audio bar when collapsed */}
        {isAudioBarCollapsed && (
          <div className="absolute bottom-full right-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAudioBarCollapsed(false)}
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Audio Recording
            </Button>
          </div>
        )}
      </div>

      <ChatSidebar
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        csvId={csvId}
        initialPrompt={initialPrompt}
        dashboardId={id}
      />
    </div>
  )
}
