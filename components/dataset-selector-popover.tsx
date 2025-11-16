"use client"

import * as React from "react"
import { Plus, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface Dataset {
  tableName: string
  fileName: string
  rowCount: number
}

interface DatasetSelectorPopoverProps {
  onDatasetSelect: (dataset: Dataset) => void
  onUploadNew: () => void
  excludeDatasets?: string[] // Table names to exclude from list
  cachedDatasets?: Dataset[] | null
  onDatasetsFetched?: (datasets: Dataset[]) => void
}

export function DatasetSelectorPopover({
  onDatasetSelect,
  onUploadNew,
  excludeDatasets = [],
  cachedDatasets = null,
  onDatasetsFetched
}: DatasetSelectorPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [datasets, setDatasets] = React.useState<Dataset[]>(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('datasets-cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          const cacheAge = Date.now() - parsed.timestamp
          // Cache for 5 minutes
          if (cacheAge < 5 * 60 * 1000) {
            return parsed.data
          }
        } catch (e) {
          console.error('Failed to parse cached datasets:', e)
        }
      }
    }
    return cachedDatasets || []
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Pre-fetch datasets on mount if not cached
  React.useEffect(() => {
    if (!cachedDatasets && datasets.length === 0) {
      fetchDatasets()
    }
  }, [])

  // Update local state when cached data changes
  React.useEffect(() => {
    if (cachedDatasets) {
      setDatasets(cachedDatasets)
    }
  }, [cachedDatasets])

  const fetchDatasets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/datasets/list')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch datasets')
      }

      const fetchedDatasets = data.datasets || []
      setDatasets(fetchedDatasets)
      
      // Cache in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('datasets-cache', JSON.stringify({
          data: fetchedDatasets,
          timestamp: Date.now()
        }))
      }
      
      if (onDatasetsFetched) {
        onDatasetsFetched(fetchedDatasets)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets')
      console.error('Error fetching datasets:', err)
    } finally {
      setLoading(false)
    }
  }

  const availableDatasets = datasets.filter(
    d => !excludeDatasets.includes(d.tableName)
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          aria-label="Add dataset"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex flex-col">
          <div className="px-4 py-3">
            <h4 className="font-medium text-sm">Add Dataset</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Select an existing dataset or upload a new one
            </p>
          </div>
          <Separator />
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDatasets}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : availableDatasets.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {excludeDatasets.length > 0 
                  ? 'All datasets have been added'
                  : 'No datasets available'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="px-2 py-2">
                {availableDatasets.map((dataset) => (
                  <button
                    key={dataset.tableName}
                    onClick={() => {
                      onDatasetSelect(dataset)
                      setOpen(false)
                    }}
                    className={cn(
                      "w-full flex flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <span className="font-medium truncate w-full">
                      {dataset.fileName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dataset.rowCount.toLocaleString()} rows
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onUploadNew()
                setOpen(false)
              }}
              className="w-full justify-start"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Dataset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
