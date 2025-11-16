"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ReactNode } from "react"

interface AppHeaderProps {
  breadcrumbs?: {
    label: string
    href?: string
  }[]
  actions?: ReactNode
}

export function AppHeader({ breadcrumbs = [], actions }: AppHeaderProps) {
  const truncateLabel = (label: string, maxLength: number = 30) => {
    if (label.length <= maxLength) return label
    return label.substring(0, maxLength) + "..."
  }

  return (
    <>
      <header className="flex h-16 shrink-0 w-full items-center gap-2 px-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          {breadcrumbs.length > 0 && (
            <Breadcrumb className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="contents">
                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href} title={crumb.label}>
                          {truncateLabel(crumb.label)}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage title={crumb.label}>{truncateLabel(crumb.label)}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <Separator className="shrink-0" />
    </>
  )
}
