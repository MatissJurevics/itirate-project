"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DashboardChart } from "@/components/dashboard-chart"
import type { ChartType } from "@/lib/charts/types"
import { GripVertical } from "lucide-react"

interface Widget {
  id: string
  data?: any
  title?: string
  type?: ChartType
  widgetType?: ChartType
  categories?: string[]
  mapData?: any
  mapType?: string
  highchartsConfig?: any
}

interface SortableWidgetProps {
  widget: Widget
}

export function SortableWidget({ widget }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/50 aspect-video flex items-center justify-center p-2 w-full min-w-0 overflow-hidden h-full rounded-lg border-2 border-transparent hover:border-border relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded p-1 hover:bg-background"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <DashboardChart
        highchartsConfig={widget.highchartsConfig}
        type={widget.type || widget.widgetType}
        data={widget.data}
        title={widget.title}
        categories={widget.categories}
        mapData={widget.mapData}
        mapType={widget.mapType}
        showCopyButton={true}
      />
    </div>
  )
}

