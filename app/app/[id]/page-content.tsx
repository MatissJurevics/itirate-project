"use client"

import * as React from "react"
import { EditHeader } from "@/components/edit-header"
import { ChatSidebar } from "@/components/chat-sidebar"

interface PageContentProps {
  id: string
}

export function PageContent({ id }: PageContentProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false)

  // Create supabase client and fetch the dashboard row whose id matches the slug

  // Import here would normally be:
  // import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  // Only create client once
  const supabaseRef = React.useRef<any>(null)
  if (!supabaseRef.current && supabaseUrl && supabaseKey) {
    // @ts-ignore
    supabaseRef.current = window['supabase'] 
      ? window['supabase'] 
      // @ts-ignore
      : (window['supabase'] = (require('@supabase/supabase-js').createClient(supabaseUrl, supabaseKey)))
  }
  const supabase = supabaseRef.current

  const [dashboard, setDashboard] = React.useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = React.useState(true)
  const [dashboardError, setDashboardError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true
    if (!supabase || !id) return

    setDashboardLoading(true)
    setDashboardError(null)
    supabase
      .from('dashboards')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }: any) => {
        if (!isMounted) return
        if (error) {
          setDashboardError(error.message)
          setDashboard(null)
          console.error(error)
        } else {
          setDashboard(data)
          console.log(data)
        }
        setDashboardLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [supabase, id])

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

