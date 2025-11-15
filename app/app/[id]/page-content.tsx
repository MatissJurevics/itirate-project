"use client"

import * as React from "react"
import { EditHeader } from "@/components/edit-header"
import { ChatSidebar } from "@/components/chat-sidebar"
import { createClient } from "@/lib/supabase/client"

interface PageContentProps {
  id: string
}

export function PageContent({ id }: PageContentProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchDashboard = async () => {
      const supabase = createClient();
      console.log(id)
      const { data, error } = await supabase
        .from("dashboards")
        .select("*")
        .single();

      if (error) {
        console.error("Failed to fetch dashboard:", error);
      } else {
        console.log(data)
      }
    };

    fetchDashboard();
  }, [id]);
  return (
    <div className="flex h-full w-full">
      <div className="flex flex-1 flex-col min-w-0">
        <EditHeader id={id} onChatOpen={() => setIsChatOpen(true)} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      </div>
      <ChatSidebar open={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  )
}

