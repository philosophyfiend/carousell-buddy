import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Listing, PaginatedListings, ListingStatus } from '@/types'

export function useListings(
  searchId: string,
  status?: ListingStatus | 'all',
  page: number = 1,
  pageSize: number = 48,
  sortBy?: string
) {
  return useQuery<PaginatedListings>({
    queryKey: ['listings', searchId, status, page, pageSize, sortBy],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        search_id: searchId,
        page,
        page_size: pageSize,
      }
      if (status && status !== 'all') params.status = status
      if (sortBy) params.sort_by = sortBy
      const res = await api.get<PaginatedListings>(`/listings`, { params })
      return res.data
    },
    enabled: !!searchId,
  })
}

export function useAllRecentListings(searchIds: string[]) {
  return useQuery<Listing[]>({
    queryKey: ['listings', 'recent', searchIds],
    queryFn: async () => {
      if (searchIds.length === 0) return []
      const promises = searchIds.map(id =>
        api
          .get<PaginatedListings>(`/listings`, {
            params: { search_id: id, status: 'active', page: 1, page_size: 5 },
          })
          .then(r => r.data.items)
          .catch(() => [] as Listing[])
      )
      const results = await Promise.all(promises)
      const all = results.flat()
      // Sort by first_seen_at descending
      all.sort(
        (a, b) =>
          new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime()
      )
      return all.slice(0, 20)
    },
    enabled: searchIds.length > 0,
  })
}
