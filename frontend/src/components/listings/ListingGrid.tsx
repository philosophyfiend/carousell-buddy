import { ListingCard } from './ListingCard'
import { ListingCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShoppingBag } from 'lucide-react'
import type { Listing } from '@/types'

interface ListingGridProps {
  listings: Listing[]
  isLoading?: boolean
}

export function ListingGrid({
  listings,
  isLoading = false,
}: ListingGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No listings found"
        description="No listings match your current filters. Try adjusting your search criteria."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
        />
      ))}
    </div>
  )
}
