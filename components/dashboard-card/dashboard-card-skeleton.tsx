import { Skeleton } from "@/components/ui/skeleton"

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden h-80 flex flex-col">
      {/* Chart Preview Skeleton */}
      <div className="relative w-full h-48 bg-gradient-to-br from-background/50 to-background/80 flex items-center justify-center">
        <Skeleton className="w-3/4 h-3/4" />
      </div>

      {/* Card Content Skeleton */}
      <div className="flex flex-col gap-3 p-4 bg-card border-t flex-1">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}
