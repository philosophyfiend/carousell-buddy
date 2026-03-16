import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Select'
import type { ListingStatus, SortBy } from '@/types'

interface ListingFiltersProps {
  status: ListingStatus | 'all'
  onStatusChange: (status: ListingStatus | 'all') => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  totalCount?: number
}

const statusOptions: { label: string; value: ListingStatus | 'all' }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Sold', value: 'sold' },
  { label: 'All', value: 'all' },
]

const sortOptions = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
]

export function ListingFilters({
  status,
  onStatusChange,
  sortBy,
  onSortChange,
  totalCount,
}: ListingFiltersProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
              status === opt.value
                ? 'bg-brand-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {opt.label}
          </button>
        ))}
        {totalCount !== undefined && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {totalCount.toLocaleString()} listings
          </span>
        )}
      </div>
      <Select
        options={sortOptions}
        value={sortBy}
        onChange={(v) => onSortChange(v as SortBy)}
        className="w-48"
      />
    </div>
  )
}
