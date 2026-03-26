import { ExternalLink, ShoppingBag, EyeOff } from 'lucide-react'
import { cn, formatPrice, timeAgo } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Listing, SavedSearch } from '@/types'

interface ActivityFeedProps {
  listings: Listing[]
  searches: SavedSearch[]
  isLoading?: boolean
  onExclude?: (listingId: string) => void
}

function getSearchName(searchId: string, searches: SavedSearch[]) {
  return searches.find((s) => s.id === searchId)?.name ?? 'Unknown Search'
}

export function ActivityFeed({ listings, searches, isLoading = false, onExclude }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Latest new listings across all searches
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No recent activity"
            description="New listings will appear here as your searches run."
          />
        ) : (
          <div className="space-y-1">
            {listings.map((listing) => (
              <div
                key={listing.id}
                onClick={() => window.open(listing.listing_url, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-3 rounded-lg p-2.5 -mx-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                  {listing.image_url ? (
                    <img
                      src={listing.image_url}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {listing.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getSearchName(listing.search_id, searches)}
                    </span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {timeAgo(listing.first_seen_at)}
                    </span>
                  </div>
                </div>

                {/* Price + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {onExclude && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExclude(listing.id)
                      }}
                      title="Hide listing"
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <EyeOff className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      listing.price != null ? 'text-brand-500' : 'text-gray-400'
                    )}
                  >
                    {formatPrice(listing.price)}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
