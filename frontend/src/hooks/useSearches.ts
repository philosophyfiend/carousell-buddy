import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { SavedSearch, ScrapeRun, SearchFormValues } from '@/types'

export function useSearches() {
  return useQuery<SavedSearch[]>({
    queryKey: ['searches'],
    queryFn: async () => {
      const res = await api.get<SavedSearch[]>('/searches')
      return res.data
    },
  })
}

export function useSearch(id: string) {
  return useQuery<SavedSearch>({
    queryKey: ['searches', id],
    queryFn: async () => {
      const res = await api.get<SavedSearch>(`/searches/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateSearch() {
  const queryClient = useQueryClient()

  return useMutation<SavedSearch, Error, SearchFormValues>({
    mutationFn: async (data) => {
      const res = await api.post<SavedSearch>('/searches', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      toast.success('Search created successfully!')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to create search.'
      toast.error(msg)
    },
  })
}

export type UpdateSearchPayload = {
  id: string
  data: Partial<SearchFormValues> & { enabled?: boolean }
}

export function useUpdateSearch() {
  const queryClient = useQueryClient()

  return useMutation<SavedSearch, Error, UpdateSearchPayload>({
    mutationFn: async ({ id, data }) => {
      const res = await api.patch<SavedSearch>(`/searches/${id}`, data)
      return res.data
    },
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      queryClient.invalidateQueries({ queryKey: ['searches', id] })
      toast.success('Search updated!')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to update search.'
      toast.error(msg)
    },
  })
}

export function useDeleteSearch() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/searches/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      toast.success('Search deleted.')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to delete search.'
      toast.error(msg)
    },
  })
}

export function useRunSearch() {
  const queryClient = useQueryClient()

  return useMutation<{ detail: string }, Error, string>({
    mutationFn: async (id) => {
      const res = await api.post<{ detail: string }>(`/searches/${id}/run`)
      return res.data
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['searches'] })
      queryClient.invalidateQueries({ queryKey: ['searches', id] })
      queryClient.invalidateQueries({ queryKey: ['runs', id] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      toast.success('Scrape started!')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to start scrape.'
      toast.error(msg)
    },
  })
}

export function useScrapeRuns(searchId: string) {
  return useQuery<ScrapeRun[]>({
    queryKey: ['runs', searchId],
    queryFn: async () => {
      const res = await api.get<ScrapeRun[]>(`/searches/${searchId}/runs`)
      return res.data
    },
    enabled: !!searchId,
  })
}
