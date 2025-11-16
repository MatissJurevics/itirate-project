"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { PageTitle } from "@/components/page-title"
import { ChatSidebar } from "@/components/chat-sidebar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { CloudscapeBoardDashboard } from "@/components/cloudscape-board-dashboard"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, ChevronDown, ChevronUp } from "lucide-react"
import { adaptChartData, type ChartApiResponse } from "@/lib/charts/adapter"
import type { ChartType } from "@/lib/charts/types"
import { useSidebar } from "@/components/ui/sidebar"
import { nanoid } from "nanoid"

interface PageContentProps {
  id: string
}

interface Widget {
  id: string
  // Position and size for Board layout
  rowSpan?: number
  columnSpan?: number
  columnOffset?: { [columns: number]: number }
  // Existing properties
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

  const [isChatOpen, setIsChatOpen] = React.useState(false)
  const [isTranscriptOpen, setIsTranscriptOpen] = React.useState(false)
  const [dashboard, setDashboard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)
  const [isAudioBarCollapsed, setIsAudioBarCollapsed] = React.useState(true)
  const { state: sidebarState } = useSidebar()
  const audioRef = React.useRef<HTMLAudioElement>(null)

  // Derive values from dashboard (database)
  const csvTableName = dashboard?.csv_table_name || ""
  const fileName = dashboard?.file_name || ""
  const rowCount = dashboard?.row_count?.toString() || ""
  const initialPrompt = dashboard?.initial_prompt || ""

  const ensureWidgetIds = React.useCallback((widgets: any[]): Widget[] => {
    return widgets.map((widget: any, index: number) => {
      const baseWidget = widget.id
        ? (widget as Widget)
        : ({
          ...widget,
          id: widget.chartId || nanoid(),
        } as Widget)

      // Add default position/size if missing
      return {
        ...baseWidget,
        rowSpan: baseWidget.rowSpan ?? 3,
        columnSpan: baseWidget.columnSpan ?? 4,
        columnOffset: baseWidget.columnOffset,
      }
    })
  }, [])

  const handleItemsChange = React.useCallback(
    async (updatedWidgets: Widget[]) => {
      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
      }

      setDashboard(updatedDashboard)

      try {
        const supabase = createClient()
        const { error } = await supabase
          .from("dashboards")
          .update({ widgets: updatedWidgets })
          .eq("id", id)

        if (error) {
          console.error("Failed to persist widget layout:", error)
        }
      } catch (error) {
        console.error("Error persisting widget layout:", error)
      }
    },
    [dashboard, id]
  )

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)

      try {
        const supabase = createClient()

        // Fetch dashboard metadata
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

        // Fetch charts from the charts table for this dashboard
        const { data: chartsData, error: chartsError } = await supabase
          .from("charts")
          .select("id, chart_options, chart_type, sql_query, user_prompt, created_at")
          .eq("dashboard_id", id)
          .order("created_at", { ascending: true })

        if (chartsError) {
          console.error("Failed to fetch charts:", chartsError)
        }

        // Convert charts from database to widget format
        const chartsAsWidgets = (chartsData || []).map((chart: any) => ({
          id: chart.id,
          chartId: chart.id,
          highchartsConfig: chart.chart_options,
          chartType: chart.chart_type,
          type: chart.chart_type,
          sqlQuery: chart.sql_query,
          userPrompt: chart.user_prompt,
          createdAt: chart.created_at
        }))

        // Combine dashboard widgets (legacy) with charts from charts table
        const legacyWidgets = (data.widgets || []).map((widget: any) => {
          const isApiResponseFormat =
            (widget.chartId !== undefined || widget.success !== undefined) ||
            (widget.chartType !== undefined && widget.widgetConfig !== undefined) ||
            (widget.dataPreview !== undefined && widget.chartType !== undefined)

          if (isApiResponseFormat) {
            return adaptChartData(widget as ChartApiResponse)
          }

          return widget
        })

        const normalizedData = {
          ...data,
          widgets: ensureWidgetIds([...legacyWidgets, ...chartsAsWidgets]),
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
  }, [id, ensureWidgetIds])

  const audioUrl = dashboard?.audio || null
  const transcript = dashboard?.transcript || null

  // Function to reload charts when a new one is generated
  const reloadCharts = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: chartsData, error: chartsError } = await supabase
        .from("charts")
        .select("id, chart_options, chart_type, sql_query, user_prompt, created_at")
        .eq("dashboard_id", id)
        .order("created_at", { ascending: true })

      if (chartsError) {
        console.error("Failed to reload charts:", chartsError)
        return
      }

      const chartsAsWidgets = (chartsData || []).map((chart: any) => ({
        id: chart.id,
        chartId: chart.id,
        highchartsConfig: chart.chart_options,
        chartType: chart.chart_type,
        type: chart.chart_type,
        sqlQuery: chart.sql_query,
        userPrompt: chart.user_prompt,
        createdAt: chart.created_at
      }))

      setDashboard((prev: any) => ({
        ...prev,
        widgets: ensureWidgetIds(chartsAsWidgets)
      }))
    } catch (error) {
      console.error("Error reloading charts:", error)
    }
  }, [id, ensureWidgetIds])

  // Auto-process initial prompt on page load (without opening chat)
  const [hasProcessedInitialPrompt, setHasProcessedInitialPrompt] = React.useState(false)
  const [isProcessingInitialPrompt, setIsProcessingInitialPrompt] = React.useState(false)

  React.useEffect(() => {
    const processInitialPrompt = async () => {
      if (!dashboard || !initialPrompt || !csvTableName || loading || hasProcessedInitialPrompt || isProcessingInitialPrompt) {
        return
      }

      const widgets = dashboard.widgets || []
      // Only auto-process if there are no charts yet
      if (widgets.length > 0) {
        setHasProcessedInitialPrompt(true)
        return
      }

      setIsProcessingInitialPrompt(true)
      console.log('Auto-processing initial prompt:', initialPrompt)

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: initialPrompt }],
            csvId: csvTableName,
            dashboardId: id
          })
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        // Stream the response but don't display it (just let it complete)
        const reader = response.body?.getReader()
        if (reader) {
          while (true) {
            const { done } = await reader.read()
            if (done) break
          }
        }

        console.log('Initial prompt processed, reloading charts...')
        // Reload charts after processing
        setTimeout(() => reloadCharts(), 500)
      } catch (error) {
        console.error('Failed to process initial prompt:', error)
      } finally {
        setHasProcessedInitialPrompt(true)
        setIsProcessingInitialPrompt(false)
      }
    }

    processInitialPrompt()
  }, [dashboard, initialPrompt, csvTableName, loading, hasProcessedInitialPrompt, isProcessingInitialPrompt, id, reloadCharts])

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div className={`flex flex-1 flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${isAudioBarCollapsed ? 'pb-0' : 'pb-16'}`}>
        <AppHeader
          breadcrumbs={[
            { label: "Dashboards", href: "/app" },
            { label: dashboard?.title || "Loading..." }
          ]}
          actions={
            <Button onClick={() => setIsChatOpen(true)} disabled={loading}>
              New Visualisation
            </Button>
          }
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
                    {csvTableName ? `csv_to_table.${csvTableName}` : 'N/A'}
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

        {loading ? (
          <div className="px-4 pt-4 pb-2">
            <div className="h-14 w-64 bg-muted/50 animate-pulse rounded" />
            <div className="h-px bg-border mt-2 mb-4" />
          </div>
        ) : dashboard?.title ? (
          <PageTitle
            editable={true}
            onEdit={async (newTitle: string) => {
              try {
                const supabase = createClient()
                const { error } = await supabase
                  .from("dashboards")
                  .update({ title: newTitle })
                  .eq("id", id)

                if (error) {
                  console.error("Failed to update title:", error)
                  throw error
                }

                // Update local state
                setDashboard((prev: any) => ({
                  ...prev,
                  title: newTitle,
                }))
              } catch (error) {
                console.error("Error updating title:", error)
                throw error
              }
            }}
          >
            {dashboard.title}
          </PageTitle>
        ) : null}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="bg-muted/50 aspect-video animate-pulse rounded" />
              <div className="bg-muted/50 aspect-video animate-pulse rounded" />
              <div className="bg-muted/50 aspect-video animate-pulse rounded" />
            </div>
          ) : dashboard && dashboard.widgets && dashboard.widgets.length > 0 ? (
            <CloudscapeBoardDashboard
              widgets={dashboard.widgets}
              onItemsChange={handleItemsChange}
            />
          ) : (
            <div className="col-span-3 flex items-center justify-center text-muted-foreground">
              No widgets to display.
            </div>
          )}
        </div>
      </div>
      {/* Re-open Audio Bar Button - Shows when collapsed */}
      {isAudioBarCollapsed && (
        <div className={`fixed bottom-0 z-40 transition-all duration-300 ease-in-out ${isChatOpen ? 'right-[24rem]' : 'right-4'}`}>
          <Button
            variant="ghost"
            onClick={() => setIsAudioBarCollapsed(false)}
            className="h-8 px-3 rounded-none rounded-t-md border border-b-0 bg-background hover:bg-accent flex items-center gap-1.5"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="font-fancy text-lg leading-none">Audio</span>
            <span className="sr-only">Open audio player</span>
          </Button>
        </div>
      )}
      {/* Audio Bar - Fixed at bottom */}
      <div className={`fixed bottom-0 z-40 border-t bg-background transition-all duration-300 ease-in-out overflow-hidden ${isAudioBarCollapsed ? 'h-0' : 'h-16'} ${sidebarState === 'expanded' ? 'left-[19rem]' : 'left-0'} ${isChatOpen ? 'right-[24rem]' : 'right-0'}`}>
        <div className="px-4 py-3 flex items-center gap-4 h-full">
          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="flex-1 h-8"
            />
          ) : (
            <div className="flex-1 h-8 bg-muted border border-border flex items-center justify-center">
              <span className="text-sm text-muted-foreground">No audio available</span>
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
      </div>
      <ChatSidebar
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        csvId={csvTableName}
        initialPrompt={initialPrompt}
        dashboardId={id}
        onChartGenerated={reloadCharts}
      />
    </div>
  )
}
