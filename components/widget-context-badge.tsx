"use client"

import { BarChart3, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WidgetContextBadgeProps {
  widgetTitle?: string
  widgetType?: string
  onClear: () => void
  className?: string
}

export function WidgetContextBadge({
  widgetTitle,
  widgetType,
  onClear,
  className
}: WidgetContextBadgeProps) {
  const displayTitle = widgetTitle || "Untitled Chart"
  const truncatedTitle = displayTitle.length > 25 
    ? `${displayTitle.substring(0, 22)}...` 
    : displayTitle

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 h-8 border bg-primary/10 text-primary border-primary/20 shadow-sm",
        className
      )}
    >
      <BarChart3 className="h-4 w-4 flex-shrink-0" />
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-sm font-medium truncate" title={displayTitle}>
          {truncatedTitle}
        </span>
        {widgetType && (
          <span className="text-xs opacity-70 whitespace-nowrap">
            {widgetType}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-1 flex-shrink-0 hover:bg-primary/20 text-primary hover:text-primary"
        onClick={onClear}
        aria-label="Clear widget context"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
