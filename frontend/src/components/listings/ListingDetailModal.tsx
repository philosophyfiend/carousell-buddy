import { X, ExternalLink, ShoppingBag } from 'lucide-react'
import { cn, formatPrice, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PriceHistoryChart } from './PriceHistoryChart'
import type { Listing } from '@/types'

interface ListingDetailModalProps {
  listingId: string | null
  listing?: Listing | null
  open: boolean
  onClose: () => void
}

export function ListingDetailModal({ listingId, listing, open, onClose }: ListingDetailModalProps) {
  if (!open || !listingId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {listing ? (
          <>
            {/* Image */}
            <div className="relative bg-gray-100 dark:bg-gray-700 aspect-video rounded-t-2xl overflow-hidden">
              {listing.image_url ? (
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                </div>
              )}
              {listing.status === 'sold' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Badge variant="destructive" className="text-lg font-bold px-4 py-1.5">
                    SOLD
                  </Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8">
                  {listing.title}
                </h2>
                <p
                  className={cn(
                    'text-xl font-bold mt-1',
                    listing.price != null ? 'text-brand-500' : 'text-gray-400'
                  )}
                >
                  {formatPrice(listing.price)}
                </p>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-2">
                {listing.condition && (
                  <Badge variant={listing.condition.toUpperCase() === 'NEW' ? 'success' : 'secondary'}>
                    {listing.condition}
                  </Badge>
                )}
                <Badge variant="outline">{timeAgo(listing.first_seen_at)}</Badge>
                {listing.seller_name && (
                  <Badge variant="outline">@{listing.seller_name}</Badge>
                )}
              </div>

              {/* Price History Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price History
                </h3>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <PriceHistoryChart listingId={listingId} />
                </div>
              </div>

              {/* View on Carousell */}
              <Button
                fullWidth
                onClick={() => window.open(listing.listing_url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                View on Carousell
              </Button>
            </div>
          </>
        ) : (
          <div className="p-8">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Price History
            </h3>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <PriceHistoryChart listingId={listingId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
