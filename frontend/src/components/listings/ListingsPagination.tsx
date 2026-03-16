import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface ListingsPaginationProps {
  page: number
  pages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function ListingsPagination({
  page,
  pages,
  total,
  pageSize,
  onPageChange,
}: ListingsPaginationProps) {
  if (pages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2
    const range: (number | 'ellipsis')[] = []
    const left = page - delta
    const right = page + delta + 1

    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= left && i < right)) {
        range.push(i)
      }
    }

    const result: (number | 'ellipsis')[] = []
    let prev: number | null = null
    for (const i of range) {
      if (prev !== null && (i as number) - prev > 1) {
        result.push('ellipsis')
      }
      result.push(i)
      prev = i as number
    }
    return result
  }

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {start}–{end} of {total.toLocaleString()} listings
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((num, idx) =>
          num === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
              ...
            </span>
          ) : (
            <button
              key={num}
              onClick={() => onPageChange(num as number)}
              className={cn(
                'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                page === num
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {num}
            </button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
