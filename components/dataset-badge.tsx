"use client"

import * as React from "react"
import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatasetBadgeProps {
  tableName: string
  fileName: string
  rowCount?: number
  addedAt?: string
  onRemove?: (tableName: string) => void
  className?: string
}

export function DatasetBadge({
  tableName,
  fileName,
  rowCount,
  addedAt,
  onRemove,
  className
}: DatasetBadgeProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  // Truncate filename if too long
  const truncatedName = fileName.length > 20 
    ? `${fileName.substring(0, 17)}...` 
    : fileName

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove(tableName)
    }
  }

  return (
    <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 h-8 border bg-card text-card-foreground shadow-sm cursor-pointer hover:bg-muted/50 transition-colors",
            className
          )}
        >
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-medium truncate" title={fileName}>
              {truncatedName}
            </span>
            {rowCount !== undefined && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {rowCount.toLocaleString()} rows
              </span>
            )}
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-1 flex-shrink-0 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={handleRemove}
              aria-label={`Remove ${fileName}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">Dataset Details</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Name:</span>
              <span className="font-medium text-right break-all">{fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Table Name:</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-right break-all">
                csv_to_table.{tableName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Row Count:</span>
              <span className="font-medium">{rowCount?.toLocaleString() || 'N/A'}</span>
            </div>
            {addedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added:</span>
                <span className="font-medium">
                  {new Date(addedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
