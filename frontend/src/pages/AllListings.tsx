import { useState } from 'react'
import { Shell } from '@/components/layout/Shell'
import { PageHeader } from '@/components/layout/PageHeader'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { ListingsPagination } from '@/components/listings/ListingsPagination'
import { ListingDetailModal } from '@/components/listings/ListingDetailModal'
import { Select } from '@/components/ui/Select'
import { useSearches } from '@/hooks/useSearches'
import { useAllListings, useExcludeListing, useRestoreListing } from '@/hooks/useListings'
import type { ListingStatus, SortBy } from '@/types'

export default function AllListingsPage() {
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all' | 'hidden'>('active')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [page, setPage] = useState(1)
  const [searchFilter, setSearchFilter] = useState<string>('__all__')
  const [detailListingId, setDetailListingId] = useState<string | null>(null)

  const PAGE_SIZE = 48
  const ALL_SEARCHES = '__all__'

  const { data: searches = [] } = useSearches()
  const isHiddenFilter = statusFilter === 'hidden'
  const { data: listingsData, isLoading, isError } = useAllListings(
    isHiddenFilter ? 'active' : statusFilter === 'all' ? undefined : statusFilter,
    page,
    PAGE_SIZE,
    sortBy,
    isHiddenFilter,
    searchFilter === ALL_SEARCHES ? undefined : searchFilter
  )

  const excludeListing = useExcludeListing()
  const restoreListing = useRestoreListing()

  const handleStatusChange = (status: ListingStatus | 'all' | 'hidden') => {
    setStatusFilter(status)
    setPage(1)
  }
  const searchOptions = [
    { label: 'All Searches', value: ALL_SEARCHES },
    ...searches.map(s => ({ label: s.name, value: s.id })),
  ]

  const items = listingsData?.items ?? []

  return (
    <Shell>
      <PageHeader
        title="All Items"
        subtitle="Browse all listings across your searches"
      />

      {/* Search filter */}
      {searches.length > 1 && (
        <div className="mb-4">
          <Select
            options={searchOptions}
            value={searchFilter}
            onChange={(v) => { setSearchFilter(v); setPage(1) }}
            className="w-64"
          />
        </div>
      )}

      <ListingFilters
        status={statusFilter}
        onStatusChange={handleStatusChange}
        sortBy={sortBy}
        onSortChange={(s) => { setSortBy(s); setPage(1) }}
        totalCount={listingsData?.total}
      />

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Failed to load listings. Make sure your backend is updated and the database migration has been run.
          </p>
        </div>
      ) : (
        <ListingGrid
          listings={items}
          isLoading={isLoading}
          onExclude={(listingId) => excludeListing.mutate(listingId)}
          onRestore={isHiddenFilter ? (listingId) => restoreListing.mutate(listingId) : undefined}
          onShowDetail={setDetailListingId}
        />
      )}

      {listingsData && listingsData.pages > 1 && (
        <ListingsPagination
          page={listingsData.page}
          pages={listingsData.pages}
          total={listingsData.total}
          pageSize={listingsData.page_size}
          onPageChange={setPage}
        />
      )}

      <ListingDetailModal
        listingId={detailListingId}
        listing={items.find(l => l.id === detailListingId)}
        open={!!detailListingId}
        onClose={() => setDetailListingId(null)}
      />
    </Shell>
  )
}
