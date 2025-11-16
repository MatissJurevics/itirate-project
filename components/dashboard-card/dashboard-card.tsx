"use client"

import Link from "next/link"
import { DashboardChart } from "@/components/dashboard-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, LayoutDashboard, TrendingUp, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ChartType } from "@/lib/charts/types"

interface Widget {
  data?: any
  title?: string
  type?: string
  widgetType?: string
  categories?: string[]
  mapData?: any
  mapType?: string
  highchartsConfig?: any
}

interface DashboardCardProps {
  id: string
  title: string
  widgets?: Widget[]
  created_at?: string
  onDelete?: (id: string) => void
}

export function DashboardCard({ id, title, widgets = [], created_at, onDelete }: DashboardCardProps) {
  const widgetCount = widgets.length
  const formattedDate = created_at
    ? formatDistanceToNow(new Date(created_at), { addSuffix: true })
    : "Unknown"

  const chartTypes = widgets
    .map(w => w.type || w.widgetType)
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .slice(0, 3)

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete && confirm(`Are you sure you want to delete "${title}"?`)) {
      onDelete(id)
    }
  }

  return (
    <div className="relative group">
      {/* Delete Button - Outside Link to prevent navigation */}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-8 w-8"
          onClick={handleDelete}
          aria-label="Delete dashboard"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      
      <Link href={`/app/${id}`}>
        <div className="cursor-pointer rounded-md border bg-card transition-all duration-300 overflow-hidden h-80 flex flex-col">
          {/* Chart Preview */}
          <div className="relative w-full h-48 bg-gradient-to-br from-background/50 to-background/80 flex items-center justify-center overflow-hidden">
            {widgets.length > 0 ? (
              <>
                <div className="w-full h-full scale-75 origin-center pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
                  <DashboardChart
                    highchartsConfig={widgets[0].highchartsConfig}
                    type={(widgets[0].type || widgets[0].widgetType) as ChartType | undefined}
                    data={widgets[0].data}
                    title={widgets[0].title}
                    categories={widgets[0].categories}
                    mapData={widgets[0].mapData}
                    mapType={widgets[0].mapType}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="bg-muted p-4">
                  <LayoutDashboard className="size-8 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">No widgets yet</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
          </div>

          {/* Card Content */}
          <div className="flex flex-col gap-3 p-4 bg-card border-t flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors flex-1">
                {title.replace(/\w\S*/g, (txt: string) =>
                  txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
                )}
              </h3>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {widgetCount} {widgetCount === 1 ? "widget" : "widgets"}
              </Badge>
            </div>

            {/* Metadata */}
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <span>Created {formattedDate}</span>
              </div>

              {chartTypes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" />
                  <div className="flex flex-wrap gap-1">
                    {chartTypes.map((type, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
