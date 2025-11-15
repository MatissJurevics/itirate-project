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

interface PageContentProps {
  id: string
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
        setDashboard(data)
      }
      setLoading(false)
    };

    fetchDashboard();
  }, [id]);
  
  const audioUrl = dashboard?.audio || null
  const transcript = dashboard?.transcript || null
  
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <EditHeader id={id} onChatOpen={() => setIsChatOpen(true)} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {loading ? (
              <>
                <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
                <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
                <div className="bg-muted/50 aspect-video rounded-xl animate-pulse" />
              </>
            ) : dashboard && dashboard.widgets && dashboard.widgets.length > 0 ? (
              dashboard.widgets.map(
                (
                  widget: {
                    data: any;
                    title?: string;
                    widgetType: "pie" | "line" | "bar";
                    categories?: string[];
                  },
                  idx: number
                ) => (
                  <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center p-2 w-full min-w-0 overflow-hidden h-full" key={idx}>
                    <DashboardChart
                      type={widget.widgetType}
                      data={widget.data}
                      title={widget.title}
                      categories={widget.categories}
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
          {!loading && dashboard && (
            <div className="bg-muted/50 flex-1 rounded-xl min-h-[200px]" />
          )}
        </div>
        <div className="border-t bg-background p-4 flex items-center gap-4 shrink-0">
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
      </div>
      <ChatSidebar open={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  )
}

