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

// Memoized chart component to prevent re-renders during drag/resize
const MemoizedChartWrapper = React.memo(({ widget }: { widget: Widget }) => (
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
), (prevProps, nextProps) => {
  // Custom comparison: only re-render if widget data actually changed
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.highchartsConfig === nextProps.widget.highchartsConfig &&
    prevProps.widget.type === nextProps.widget.type &&
    prevProps.widget.widgetType === nextProps.widget.widgetType &&
    prevProps.widget.data === nextProps.widget.data &&
    prevProps.widget.title === nextProps.widget.title &&
    prevProps.widget.categories === nextProps.widget.categories &&
    prevProps.widget.mapData === nextProps.widget.mapData &&
    prevProps.widget.mapType === nextProps.widget.mapType
  )
})

interface CloudscapeBoardDashboardProps {
  widgets: Widget[]
  onItemsChange: (items: Widget[]) => void
}

export function CloudscapeBoardDashboard({
  widgets,
  onItemsChange,
}: CloudscapeBoardDashboardProps) {
  // Create Map for O(1) widget lookups instead of O(n) array.find()
  const widgetsMap = React.useMemo(() => {
    return new Map(widgets.map(w => [w.id, w]))
  }, [widgets])

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
        // Use Map.get() for O(1) lookup instead of array.find() O(n)
        const originalWidget = widgetsMap.get(item.id)
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
    [widgetsMap, onItemsChange]
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
      // Use Map.get() for O(1) lookup instead of array.find() O(n)
      const widget = item.data || widgetsMap.get(item.id)
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
          <MemoizedChartWrapper widget={widget} />
        </BoardItem>
      )
    },
    [widgetsMap]
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
      <style jsx global>{`
        /* Disable animations during drag/resize for performance */
        .awsui-board-item * {
          transition: none !important;
          animation: none !important;
        }
      `}</style>
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

