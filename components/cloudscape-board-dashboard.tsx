"use client"

import * as React from "react"
import { Board, BoardItem } from "@cloudscape-design/board-components"
import type { BoardProps } from "@cloudscape-design/board-components"
import { DashboardChart } from "@/components/dashboard-chart"
import type { ChartType } from "@/lib/charts/types"

export interface Widget {
  id: string
  // Position and size for Board layout
  rowSpan?: number
  columnSpan?: number
  columnOffset?: { [columns: number]: number }
  // Existing properties
  data?: any
  title?: string
  type?: ChartType
  widgetType?: ChartType
  categories?: string[]
  mapData?: any
  mapType?: string
  highchartsConfig?: any
}

interface CloudscapeBoardDashboardProps {
  widgets: Widget[]
  onItemsChange: (items: Widget[]) => void
}

export function CloudscapeBoardDashboard({
  widgets,
  onItemsChange,
}: CloudscapeBoardDashboardProps) {
  const handleItemsChange = React.useCallback(
    (event: CustomEvent<BoardProps.ItemsChangeDetail<Widget>>) => {
      // Extract detail from CustomEvent
      const detail = event.detail
      
      // Safety check: ensure detail and items exist
      if (!detail || !detail.items || !Array.isArray(detail.items)) {
        console.warn("Invalid items change detail:", detail)
        return
      }

      const updatedWidgets = detail.items.map((item) => {
        const originalWidget = widgets.find((w) => w.id === item.id)
        if (!originalWidget) {
          console.warn(`Widget not found for id: ${item.id}`)
          return null
        }
        
        // Preserve all original widget properties and update layout properties
        return {
          ...originalWidget,
          ...(item.data || {}),
          // Map Board item layout properties back to Widget
          rowSpan: item.rowSpan,
          columnSpan: item.columnSpan,
          columnOffset: item.columnOffset,
        } as Widget
      }).filter((widget): widget is Widget => widget !== null)

      if (updatedWidgets.length > 0) {
        onItemsChange(updatedWidgets)
      }
    },
    [widgets, onItemsChange]
  )

  const boardItems = React.useMemo(() => {
    return widgets.map((widget) => ({
      id: widget.id,
      data: widget,
      rowSpan: widget.rowSpan ?? 3,
      columnSpan: widget.columnSpan ?? 4,
      columnOffset: widget.columnOffset,
      definition: {
        minRowSpan: 2,
        minColumnSpan: 1,
        defaultRowSpan: widget.rowSpan ?? 3,
        defaultColumnSpan: widget.columnSpan ?? 4,
      },
    }))
  }, [widgets])

  const renderItem = React.useCallback(
    (item: BoardProps.Item<Widget>) => {
      const widget = item.data || widgets.find((w) => w.id === item.id)
      if (!widget) return null

      return (
        <BoardItem
          header={widget.title || "Chart"}
          i18nStrings={{
            dragHandleAriaLabel: "Drag handle",
            dragHandleAriaDescription:
              "Use arrow keys to move the item, Space to complete drag, Escape to cancel drag.",
            resizeHandleAriaLabel: "Resize handle",
            resizeHandleAriaDescription:
              "Use arrow keys to resize the item, Space to complete resize, Escape to cancel resize.",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
        </BoardItem>
      )
    },
    [widgets]
  )

  const i18nStrings: BoardProps.I18nStrings<Widget> = React.useMemo(
    () => ({
      liveAnnouncementDndStarted: (operationType) =>
        `Started ${operationType} operation`,
      liveAnnouncementDndItemReordered: (operation) =>
        `Moved ${operation.item.id}`,
      liveAnnouncementDndItemResized: (operation) =>
        `Resized ${operation.item.id}`,
      liveAnnouncementDndItemInserted: (operation) =>
        `Inserted ${operation.item.id}`,
      liveAnnouncementDndCommitted: (operationType) =>
        `Completed ${operationType} operation`,
      liveAnnouncementDndDiscarded: (operationType) =>
        `Cancelled ${operationType} operation`,
      liveAnnouncementItemRemoved: (operation) =>
        `Removed ${operation.item.id}`,
      navigationAriaLabel: "Board navigation",
      navigationItemAriaLabel: (item) =>
        item ? `Navigate to ${item.id}` : "Navigate",
    }),
    []
  )

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "600px" }}>
      <Board
        items={boardItems}
        renderItem={renderItem}
        onItemsChange={handleItemsChange}
        i18nStrings={i18nStrings}
        empty={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No widgets to display
          </div>
        }
      />
    </div>
  )
}

