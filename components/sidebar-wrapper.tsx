"use client"

import { usePathname } from 'next/navigation'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { useState, useEffect } from 'react'

interface SidebarWrapperProps {
  children: React.ReactNode
}

export function SidebarWrapper({ children }: SidebarWrapperProps) {
  const pathname = usePathname()
  const isRootPage = pathname === '/'
  // Initialize using the current path to avoid the sidebar flashing open on /
  const [open, setOpen] = useState(() => !isRootPage)
  
  useEffect(() => {
    setOpen(!isRootPage)
  }, [isRootPage])
  
  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
