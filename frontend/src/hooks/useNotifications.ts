import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { NotificationConfig } from '@/types'

export function useNotificationConfig() {
  return useQuery<NotificationConfig>({
    queryKey: ['notifications', 'config'],
    queryFn: async () => {
      const res = await api.get<NotificationConfig>('/notifications/config')
      return res.data
    },
  })
}

export function useUpdateNotificationConfig() {
  const queryClient = useQueryClient()

  return useMutation<NotificationConfig, Error, Partial<NotificationConfig>>({
    mutationFn: async (data) => {
      const res = await api.patch<NotificationConfig>('/notifications/config', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'config'] })
      toast.success('Notification settings saved!')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to save notification settings.'
      toast.error(msg)
    },
  })
}

export function useTestNotification() {
  return useMutation<void, Error, string>({
    mutationFn: async (url: string) => {
      const res = await api.post('/notifications/test', { apprise_url: url })
      return res.data
    },
    onSuccess: () => {
      toast.success('Test notification sent!')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to send test notification.'
      toast.error(msg)
    },
  })
}
