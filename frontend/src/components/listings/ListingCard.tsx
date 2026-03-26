import { useState } from 'react'
import { ExternalLink, ShoppingBag, EyeOff, Eye, TrendingUp } from 'lucide-react'
import { cn, formatPrice, timeAgo, isRecentListing } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { Listing } from '@/types'

interface ListingCardProps {
  listing: Listing
  onExclude?: (listingId: string) => void
  onRestore?: (listingId: string) => void
  onShowDetail?: (listingId: string) => void
}

export function ListingCard({ listing, onExclude, onRestore, onShowDetail }: ListingCardProps) {
  const [imgError, setImgError] = useState(false)
  const isSold = listing.status === 'sold'
  const isNew = isRecentListing(listing.first_seen_at)

  const handleCardClick = () => {
    window.open(listing.listing_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isSold && 'opacity-75',
        listing.is_excluded && 'opacity-50 ring-2 ring-red-300 dark:ring-red-700'
      )}
    >
      {/* Image */}
      <div className="relative overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-700 aspect-square">
        {listing.image_url && !imgError ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="sold-overlay">
            <Badge variant="destructive" className="text-sm font-bold px-3 py-1">
              SOLD
            </Badge>
          </div>
        )}

        {/* NEW badge */}
        {isNew && !isSold && (
          <div className="absolute top-2 left-2">
            <Badge
              variant="default"
              className="listing-card-new bg-brand-500 text-white text-xs font-bold"
            >
              NEW
            </Badge>
          </div>
        )}

        {/* Top-right action buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onShowDetail && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShowDetail(listing.id)
              }}
              title="Price history"
              className="rounded-md bg-black/50 hover:bg-brand-500/80 p-1 transition-colors"
            >
              <TrendingUp className="h-3 w-3 text-white" />
            </button>
          )}
          <div className="rounded-md bg-black/50 p-1">
            <ExternalLink className="h-3 w-3 text-white" />
          </div>
        </div>

        {/* Hide / Restore button */}
        {listing.is_excluded && onRestore ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRestore(listing.id)
            }}
            title="Restore listing"
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-brand-500/80 hover:bg-brand-600 p-1.5 z-10"
          >
            <Eye className="h-3.5 w-3.5 text-white" />
          </button>
        ) : onExclude ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExclude(listing.id)
            }}
            title="Hide listing"
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-black/50 hover:bg-red-500/80 p-1.5 z-10"
          >
            <EyeOff className="h-3.5 w-3.5 text-white" />
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
          {listing.title}
        </h3>

        {/* Price */}
        <p
          className={cn(
            'text-base font-bold',
            listing.price != null
              ? 'text-brand-500'
              : 'text-gray-400 dark:text-gray-500 text-sm font-normal'
          )}
        >
          {formatPrice(listing.price)}
        </p>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {listing.condition && (
            <Badge
              variant={listing.condition.toUpperCase() === 'NEW' ? 'success' : 'secondary'}
              className="text-xs"
            >
              {listing.condition}
            </Badge>
          )}
        </div>

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="min-w-0">
            {listing.seller_name && (
              <a
                href={listing.seller_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-500 truncate block max-w-[120px]"
              >
                @{listing.seller_name}
              </a>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {timeAgo(listing.first_seen_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
