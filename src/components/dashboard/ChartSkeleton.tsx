import { Skeleton } from "@/components/ui/skeleton";

export function KpiSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3">
      <Skeleton className="h-3 w-1/2 mb-3" />
      <Skeleton className="h-7 w-3/4" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${height}`}>
      <div className="px-3 py-1.5 border-b border-gray-100">
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="p-2 flex items-end gap-2 h-[calc(100%-2rem)]">
        {[40, 70, 50, 90, 60, 80, 45, 75, 55, 85, 65, 95].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-3 py-1.5 border-b border-gray-100">
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="p-2 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
