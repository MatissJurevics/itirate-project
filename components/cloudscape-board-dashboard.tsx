"use client"

import * as React from "react"
import { Board, BoardItem } from "@cloudscape-design/board-components"
import type { BoardProps } from "@cloudscape-design/board-components"
import { Button } from "@cloudscape-design/components"
import { DashboardChart } from "@/components/dashboard-chart"
import type { ChartType } from "@/lib/charts/types"
import { useCopyChartToClipboard } from "@/hooks/use-copy-chart"

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
  projection?: string
  highchartsConfig?: any
}

// Memoized chart component to prevent re-renders during drag/resize
const MemoizedChartWrapper = React.memo(
  React.forwardRef<any, { widget: Widget }>(({ widget }, ref) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "200px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <DashboardChart
        ref={ref}
        highchartsConfig={widget.highchartsConfig}
        type={widget.type || widget.widgetType}
        data={widget.data}
        title={widget.title}
        categories={widget.categories}
        mapData={widget.mapData}
        mapType={widget.mapType}
        projection={widget.projection}
        showCopyButton={false}
      />
    </div>
  )),
  (prevProps, nextProps) => {
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
      prevProps.widget.mapType === nextProps.widget.mapType &&
      prevProps.widget.projection === nextProps.widget.projection
    )
  }
)

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

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const chartRef = React.useRef<any>(null)
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { copyChartToClipboard, isCopying, copySuccess } = useCopyChartToClipboard(chartRef)

      const handleCopy = async () => {
        await copyChartToClipboard()
      }

      return (
        <BoardItem
          header={widget.title || "Chart"}
          settings={
            <Button
              variant="icon"
              iconName={copySuccess ? "check" : "copy"}
              onClick={handleCopy}
              loading={isCopying}
              ariaLabel="Copy chart to clipboard"
            />
          }
          i18nStrings={{
            dragHandleAriaLabel: "Drag handle",
            dragHandleAriaDescription:
              "Use arrow keys to move the item, Space to complete drag, Escape to cancel drag.",
            resizeHandleAriaLabel: "Resize handle",
            resizeHandleAriaDescription:
              "Use arrow keys to resize the item, Space to complete resize, Escape to cancel resize.",
          }}
        >
          <MemoizedChartWrapper ref={chartRef} widget={widget} />
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

        /* Custom styling for Cloudscape board components */
        .awsui-board {
          background: transparent !important;
        }

        .awsui-board-item {
          background: rgb(255, 255, 255) !important;
          border: 1px solid rgb(229, 229, 229) !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 1px 3px 0px rgb(0 0 0 / 0.05) !important;
        }

        .awsui-board-item:hover {
          box-shadow: 0 1px 3px 0px rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.10) !important;
        }

        .awsui-board-item-header {
          font-family: var(--font-instrument-serif), serif !important;
          font-size: 1.25rem !important;
          font-weight: 400 !important;
          border-bottom: 1px solid rgb(229, 229, 229) !important;
          padding: 1rem !important;
        }

        .awsui-board-item-content {
          padding: 1rem !important;
        }

        /* Drag handle styling */
        .awsui-board-item [data-drag-handle] {
          color: rgb(110, 76, 65) !important;
        }

        .awsui-board-item [data-drag-handle]:hover {
          color: rgb(48, 123, 52) !important;
        }

        /* Resize handle styling */
        .awsui-board-item [data-resize-handle] {
          color: rgb(110, 76, 65) !important;
        }

        .awsui-board-item [data-resize-handle]:hover {
          color: rgb(48, 123, 52) !important;
        }

        /* Empty state */
        .awsui-board-empty {
          background: rgb(255, 255, 255) !important;
          border: 1px dashed rgb(229, 229, 229) !important;
          border-radius: 0.5rem !important;
          color: rgb(110, 76, 65) !important;
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

