import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-100', className)} />
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3"><Skeleton className="h-3 w-16" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} className="border-b border-gray-50">
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} className="px-4 py-3">
                <Skeleton className={`h-3 ${c === 0 ? 'w-32' : c === 1 ? 'w-40' : 'w-24'}`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  )
}

export function KanbanSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-72 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {Array.from({ length: Math.floor(Math.random() * 2) + 1 }).map((_, j) => (
            <div key={j} className="card p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
