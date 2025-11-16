"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { EditHeader } from "@/components/edit-header"
import { ChatSidebar } from "@/components/chat-sidebar"

interface PageContentProps {
  id: string
}

export function PageContent({ id }: PageContentProps) {
  const searchParams = useSearchParams()
  const [isChatOpen, setIsChatOpen] = React.useState(true) // Open chat by default

  // Extract parameters from URL
  const initialPrompt = searchParams.get('prompt') || ''
  const fileName = searchParams.get('fileName') || ''
  const rowCount = searchParams.get('rows') || ''

  // The id is the csvId (e.g., "1763241650485_g5tggh")
  const csvId = id

  return (
    <div className="flex h-full w-full">
      <div className="flex flex-1 flex-col min-w-0">
        <EditHeader id={id} onChatOpen={() => setIsChatOpen(true)} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Dataset info header */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold mb-2">Dataset Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">File:</span>
                <span className="ml-2 font-medium">{fileName || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rows:</span>
                <span className="ml-2 font-medium">{rowCount || 'N/A'}</span>
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

          {/* Chart display area */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center text-muted-foreground">
              Chart 1
            </div>
            <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center text-muted-foreground">
              Chart 2
            </div>
            <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center text-muted-foreground">
              Chart 3
            </div>
          </div>

          {/* Main content area */}
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center text-muted-foreground">
            Data visualization area - Charts will appear here
          </div>
        </div>
      </div>
      <ChatSidebar
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        csvId={csvId}
        initialPrompt={initialPrompt}
      />
    </div>
  )
}
