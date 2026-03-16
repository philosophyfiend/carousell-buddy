import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { User, Token, LoginCredentials, RegisterCredentials } from '@/types'

export function useCurrentUser() {
  const token = localStorage.getItem('access_token')
  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me')
      return res.data
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<Token, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      // OAuth2 form-encoded login
      const params = new URLSearchParams()
      params.append('username', credentials.username)
      params.append('password', credentials.password)
      const res = await api.post<Token>('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return res.data
    },
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Welcome back!')
      navigate('/dashboard')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Login failed. Please check your credentials.'
      toast.error(msg)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<Token, Error, RegisterCredentials>({
    mutationFn: async (credentials) => {
      await api.post('/auth/register', {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      })
      // Auto-login after register
      const params = new URLSearchParams()
      params.append('username', credentials.username)
      params.append('password', credentials.password)
      const res = await api.post<Token>('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      return res.data
    },
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Account created! Welcome!')
      navigate('/dashboard')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.'
      toast.error(msg)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    queryClient.clear()
    navigate('/login')
    toast.success('Logged out successfully')
  }
}
