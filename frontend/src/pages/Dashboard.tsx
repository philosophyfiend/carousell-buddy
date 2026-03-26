import { Search, ShoppingBag, TrendingUp } from 'lucide-react'
import { Shell } from '@/components/layout/Shell'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { SearchStatusGrid } from '@/components/dashboard/SearchStatusGrid'
import { useSearches } from '@/hooks/useSearches'
import { useAllRecentListings, useExcludeListing } from '@/hooks/useListings'

export default function DashboardPage() {
  const { data: searches = [], isLoading: searchesLoading } = useSearches()
  const searchIds = searches.map((s) => s.id)
  const { data: recentListings = [], isLoading: listingsLoading } = useAllRecentListings(searchIds)
  const excludeListing = useExcludeListing()

  const activeSearches = searches.filter((s) => s.enabled).length
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const newToday = recentListings.filter(
    (l) => new Date(l.first_seen_at) >= todayStart
  ).length

  return (
    <Shell>
      <PageHeader title="Dashboard" subtitle="Overview of your tracked searches" />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 mb-6">
        <StatsCard
          icon={Search}
          label="Total Searches"
          value={searches.length}
          color="orange"
          isLoading={searchesLoading}
        />
        <StatsCard
          icon={ShoppingBag}
          label="Active Searches"
          value={activeSearches}
          color="green"
          isLoading={searchesLoading}
        />
        <StatsCard
          icon={TrendingUp}
          label="New Today"
          value={newToday}
          color="blue"
          isLoading={listingsLoading}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed
          listings={recentListings}
          searches={searches}
          isLoading={listingsLoading && searchIds.length > 0}
          onExclude={(id) => excludeListing.mutate(id)}
        />
        <SearchStatusGrid
          searches={searches}
          isLoading={searchesLoading}
        />
      </div>
    </Shell>
  )
}
