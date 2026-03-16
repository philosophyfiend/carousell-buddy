import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Pencil,
  Tag,
  DollarSign,
  Hash,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import { useQuery } from '@tanstack/react-query'
import { Shell } from '@/components/layout/Shell'
import { PageHeader } from '@/components/layout/PageHeader'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { ListingsPagination } from '@/components/listings/ListingsPagination'
import { ScrapeRunHistory } from '@/components/searches/ScrapeRunHistory'
import { SearchForm } from '@/components/searches/SearchForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn, formatPrice } from '@/lib/utils'
import { getSearchStats } from '@/lib/api'
import { useSearch, useUpdateSearch, useRunSearch, useScrapeRuns } from '@/hooks/useSearches'
import { useListings } from '@/hooks/useListings'
import type { ListingStatus, SortBy, SearchFormValues } from '@/types'

export default function SearchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [editOpen, setEditOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('active')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [page, setPage] = useState(1)

  const { data: search, isLoading: searchLoading } = useSearch(id!)
  const { data: runsData = [], isLoading: runsLoading } = useScrapeRuns(id!)
  const { data: statsData } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => getSearchStats(id!),
    enabled: !!id,
  })

  const PAGE_SIZE = 48

  const { data: listingsData, isLoading: listingsLoading } = useListings(
    id!,
    statusFilter === 'all' ? undefined : statusFilter,
    page,
    PAGE_SIZE,
    sortBy
  )

  const updateSearch = useUpdateSearch()
  const runSearch = useRunSearch()

  const handleUpdate = (values: SearchFormValues) => {
    updateSearch.mutate(
      { id: id!, data: values },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  const handleRun = () => {
    runSearch.mutate(id!)
  }

  const handleStatusChange = (status: ListingStatus | 'all') => {
    setStatusFilter(status)
    setPage(1)
  }

  if (searchLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </Shell>
    )
  }

  if (!search) {
    return (
      <Shell>
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">Search not found.</p>
          <Link to="/searches" className="text-brand-500 hover:text-brand-600 text-sm mt-2 inline-block">
            ← Back to searches
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/searches"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Searches
        </Link>

        <PageHeader
          title={search.name}
          subtitle={`"${search.keyword}"`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                loading={runSearch.isPending}
              >
                {!runSearch.isPending && <Play className="h-3.5 w-3.5" />}
                Run Now
              </Button>
            </div>
          }
        />

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {search.condition !== 'BOTH' && (
            <Badge variant="secondary">
              <Tag className="h-3 w-3" />
              {search.condition === 'NEW' ? 'New only' : 'Used only'}
            </Badge>
          )}
          {(search.min_price != null || search.max_price != null) && (
            <Badge variant="secondary">
              <DollarSign className="h-3 w-3" />
              {search.min_price != null ? formatPrice(search.min_price) : 'Any'} –{' '}
              {search.max_price != null ? formatPrice(search.max_price) : '∞'}
            </Badge>
          )}
          {search.brand_filters.map((b) => (
            <Badge key={b} variant="outline">
              <Hash className="h-3 w-3" />
              {b}
            </Badge>
          ))}
          {search.size_filters.map((s) => (
            <Badge key={s} variant="outline">
              <Ruler className="h-3 w-3" />
              {s}
            </Badge>
          ))}
          {search.category_name && (
            <Badge variant="outline">
              <SlidersHorizontal className="h-3 w-3" />
              {search.category_name}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="listings">
        <Tabs.List className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
          {['listings', 'history', 'stats'].map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors capitalize',
                'border-b-2 -mb-px',
                'data-[state=active]:border-brand-500 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-400',
                'data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 dark:data-[state=inactive]:text-gray-400',
                'hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab === 'history' ? 'Run History' : tab === 'stats' ? 'Price Stats' : 'Listings'}
              {tab === 'listings' && listingsData && (
                <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-normal text-gray-600 dark:text-gray-400">
                  {listingsData.total.toLocaleString()}
                </span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="listings">
          <ListingFilters
            status={statusFilter}
            onStatusChange={handleStatusChange}
            sortBy={sortBy}
            onSortChange={(s) => { setSortBy(s); setPage(1) }}
            totalCount={listingsData?.total}
          />
          <ListingGrid
            listings={listingsData?.items ?? []}
            isLoading={listingsLoading}
          />
          {listingsData && (
            <ListingsPagination
              page={listingsData.page}
              pages={listingsData.pages}
              total={listingsData.total}
              pageSize={listingsData.page_size}
              onPageChange={setPage}
            />
          )}
        </Tabs.Content>

        <Tabs.Content value="history">
          <ScrapeRunHistory runs={runsData} isLoading={runsLoading} />
        </Tabs.Content>

        <Tabs.Content value="stats">
          {statsData && statsData.count > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Price Intelligence</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on {statsData.count.toLocaleString()} priced listings
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Min Price
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(statsData.min)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Max Price
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(statsData.max)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Mean
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(Math.round(statsData.mean))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Median
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(Math.round(statsData.median))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                      P10 — Good deal below
                    </p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
                      {formatPrice(Math.round(statsData.p10))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      P25
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(Math.round(statsData.p25))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      P75
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(Math.round(statsData.p75))}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      P90
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {formatPrice(Math.round(statsData.p90))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Not enough data yet. Run the search a few times to see price statistics.
              </p>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Edit form */}
      <SearchForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        isLoading={updateSearch.isPending}
        editSearch={search}
      />
    </Shell>
  )
}
