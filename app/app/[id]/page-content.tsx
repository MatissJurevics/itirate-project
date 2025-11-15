"use client"

import * as React from "react"
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
import { FileText } from "lucide-react"
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
  const [isChatOpen, setIsChatOpen] = React.useState(false)
  const [isTranscriptOpen, setIsTranscriptOpen] = React.useState(false)
  const [dashboard, setDashboard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  React.useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("dashboards")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Failed to fetch dashboard:", error);
        setDashboard(null)
      } else {
        // Normalize widgets using the adapter if they're in API response format
        const normalizedData = {
          ...data,
          widgets: (data.widgets || []).map((widget: any) => {
            // Check if widget is in API response format
            // An API response has multiple top-level fields like chartId, success, chartType, widgetConfig, etc.
            // A normalized widget typically only has widgetType, data, title, highchartsConfig, etc.
            const isApiResponseFormat = 
              (widget.chartId !== undefined || widget.success !== undefined) ||
              (widget.chartType !== undefined && widget.widgetConfig !== undefined) ||
              (widget.dataPreview !== undefined && widget.chartType !== undefined)

            if (isApiResponseFormat) {
              // Use adapter to convert API response format to Widget format
              return adaptChartData(widget as ChartApiResponse)
            }
            
            // Widget is already in the correct format, return as-is
            return widget
          })
        }
        setDashboard(normalizedData)
      }
      setLoading(false)
    };

    fetchDashboard();
  }, [id]);
  
  const audioUrl = dashboard?.audio || null
  const transcript = dashboard?.transcript || null
  
  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden pb-20">
        <EditHeader id={id} onChatOpen={() => setIsChatOpen(true)} />
        {!loading && dashboard?.title && (
          <div className="px-4 pt-4 pb-2">
            <h1 className="text-2xl font-semibold">
              {dashboard.title.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}
            </h1>
            <div className="h-px bg-border mt-2 mb-4" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0 overflow-y-auto">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {loading ? (
              <>
                <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
                <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
                <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
              </>
            ) : dashboard && dashboard.widgets && dashboard.widgets.length > 0 ? (
              dashboard.widgets.map(
                (widget: Widget, idx: number) => (
                  <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center p-2 w-full min-w-0 overflow-hidden h-full" key={idx}>
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
                )
              )
            ) : (
              <div className="col-span-3 flex items-center justify-center text-muted-foreground">
                No widgets to display.
              </div>
            )}
          </div>
        
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 flex items-center gap-4 z-50">
        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="flex-1 h-10"
          />
        ) : (
          <div className="flex-1 h-10 bg-muted rounded border border-border flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No audio available</span>
          </div>
        )}
        {transcript && (
          <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
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
      </div>
      <ChatSidebar open={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  )
}

