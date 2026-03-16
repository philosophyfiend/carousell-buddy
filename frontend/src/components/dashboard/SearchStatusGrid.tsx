import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { cn, timeAgo, minutesToHuman } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SearchCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { SavedSearch } from '@/types'

interface SearchStatusGridProps {
  searches: SavedSearch[]
  isLoading?: boolean
}

function StatusIndicator({ search }: { search: SavedSearch }) {
  if (!search.enabled) {
    return <Badge variant="secondary" className="text-xs">Paused</Badge>
  }
  if (!search.last_run_at) {
    return <Badge variant="warning" className="text-xs">Never run</Badge>
  }
  return <Badge variant="success" className="text-xs">Active</Badge>
}

export function SearchStatusGrid({ searches, isLoading = false }: SearchStatusGridProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Status</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Overview of all your active searches
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SearchCardSkeleton key={i} />
            ))}
          </div>
        ) : searches.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No searches yet"
            description="Create your first search to start tracking listings."
            action={{ label: 'Create Search', onClick: () => navigate('/searches') }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {searches.map((search) => (
              <button
                key={search.id}
                onClick={() => navigate(`/searches/${search.id}`)}
                className={cn(
                  'text-left rounded-lg border border-gray-200 dark:border-gray-700',
                  'bg-gray-50 dark:bg-gray-700/50 p-3',
                  'hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-brand-200 dark:hover:border-brand-700',
                  'transition-all duration-150'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {search.name}
                  </p>
                  <StatusIndicator search={search} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                  "{search.keyword}"
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <span>
                    {search.last_run_at ? timeAgo(search.last_run_at) : 'Never run'}
                  </span>
                  <span>•</span>
                  <span>Every {minutesToHuman(search.interval_minutes)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
