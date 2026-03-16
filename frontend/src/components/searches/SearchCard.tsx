import { useNavigate } from 'react-router-dom'
import { Play, Pencil, Trash2, Clock } from 'lucide-react'
import { cn, timeAgo, getNextRunTime, minutesToHuman } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import type { SavedSearch } from '@/types'

interface SearchCardProps {
  search: SavedSearch
  onEdit: (search: SavedSearch) => void
  onDelete: (id: string) => void
  onRun: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
  isRunning?: boolean
  isToggling?: boolean
}

function StatusDot({ status }: { status: 'ok' | 'error' | 'running' | 'none' }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        status === 'ok' && 'bg-green-500',
        status === 'error' && 'bg-red-500',
        status === 'running' && 'bg-yellow-500 animate-pulse',
        status === 'none' && 'bg-gray-300 dark:bg-gray-600'
      )}
    />
  )
}

export function SearchCard({
  search,
  onEdit,
  onDelete,
  onRun,
  onToggle,
  isRunning = false,
  isToggling = false,
}: SearchCardProps) {
  const navigate = useNavigate()

  const conditionLabel =
    search.condition === 'BOTH' ? null : search.condition === 'NEW' ? 'New only' : 'Used only'

  const priceLabel =
    search.min_price != null || search.max_price != null
      ? `HK$${search.min_price ?? 0} – ${search.max_price ? `HK$${search.max_price}` : '∞'}`
      : null

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking buttons/switches
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="switch"]')) return
    navigate(`/searches/${search.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'rounded-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        'p-5 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{search.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">"{search.keyword}"</p>
        </div>
        <Switch
          checked={search.enabled}
          onCheckedChange={(checked) => onToggle(search.id, checked)}
          disabled={isToggling}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {conditionLabel && (
          <Badge variant="secondary" className="text-xs">
            {conditionLabel}
          </Badge>
        )}
        {priceLabel && (
          <Badge variant="secondary" className="text-xs">
            {priceLabel}
          </Badge>
        )}
        {search.brand_filters.map((b) => (
          <Badge key={b} variant="outline" className="text-xs">
            {b}
          </Badge>
        ))}
        {search.size_filters.map((s) => (
          <Badge key={s} variant="outline" className="text-xs">
            Size: {s}
          </Badge>
        ))}
        {search.category_name && (
          <Badge variant="outline" className="text-xs">
            {search.category_name}
          </Badge>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1.5">
          <StatusDot status={search.last_run_at ? 'ok' : 'none'} />
          <span>
            {search.last_run_at ? `Last run ${timeAgo(search.last_run_at)}` : 'Never run'}
          </span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Every {minutesToHuman(search.interval_minutes)}</span>
        </div>
        {search.last_run_at && search.enabled && (
          <>
            <span>•</span>
            <span>{getNextRunTime(search.last_run_at, search.interval_minutes)}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="default"
          onClick={() => onRun(search.id)}
          loading={isRunning}
          disabled={isRunning}
        >
          {!isRunning && <Play className="h-3 w-3" />}
          Run now
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(search)}>
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => onDelete(search.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
