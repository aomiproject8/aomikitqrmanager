import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-150 dark:border-zinc-900 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-32 shrink-0" />
      </div>

      {/* Search/Filter Skeleton */}
      <div className="flex gap-2 max-w-sm">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12 justify-self-end" />
          </div>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-4">
              <div className="grid grid-cols-5 gap-4 items-center">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24 font-mono" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24 justify-self-end rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
