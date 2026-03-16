import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { cn, formatDate, getDurationSeconds } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ScrapeRun } from '@/types'

interface ScrapeRunHistoryProps {
  runs: ScrapeRun[]
  isLoading?: boolean
}

function StatusIcon({ status }: { status: ScrapeRun['status'] }) {
  if (status === 'ok')
    return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'error')
    return <XCircle className="h-4 w-4 text-red-500" />
  return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
}

export function ScrapeRunHistory({ runs, isLoading = false }: ScrapeRunHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No runs yet"
        description="This search hasn't been run yet. Click 'Run Now' to start scraping."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2.5 pr-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Started
            </th>
            <th className="text-left py-2.5 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Duration
            </th>
            <th className="text-left py-2.5 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th className="text-right py-2.5 pr-4 font-medium text-gray-500 dark:text-gray-400">
              Found
            </th>
            <th className="text-right py-2.5 pr-4 font-medium text-gray-500 dark:text-gray-400">
              New
            </th>
            <th className="text-left py-2.5 font-medium text-gray-500 dark:text-gray-400">
              Error
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {runs.slice(0, 20).map((run) => (
            <tr
              key={run.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <td className="py-2.5 pr-4 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                {formatDate(run.started_at)}
              </td>
              <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {getDurationSeconds(run.started_at, run.finished_at)}
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={run.status} />
                  <span
                    className={cn(
                      'capitalize',
                      run.status === 'ok' && 'text-green-600 dark:text-green-400',
                      run.status === 'error' && 'text-red-600 dark:text-red-400',
                      run.status === 'running' && 'text-yellow-600 dark:text-yellow-400'
                    )}
                  >
                    {run.status}
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right text-gray-900 dark:text-gray-100 font-medium">
                {run.listings_found}
              </td>
              <td className="py-2.5 pr-4 text-right">
                <span
                  className={cn(
                    'font-medium',
                    run.new_listings > 0
                      ? 'text-brand-500'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {run.new_listings > 0 ? `+${run.new_listings}` : '0'}
                </span>
              </td>
              <td className="py-2.5 text-xs text-red-500 max-w-xs truncate">
                {run.error_message ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
