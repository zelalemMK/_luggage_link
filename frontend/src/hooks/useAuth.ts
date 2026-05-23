import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { authApi, setToken, clearToken, getToken } from '@/lib/api'
import type { LoginRequest, RegisterRequest, User } from '@/types'

export const AUTH_QUERY_KEY = ['auth', 'me'] as const

export function useAuth() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch current user — only runs if a token exists
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: authApi.me,
    enabled: !!getToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // ─── Login ────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: ({ token, user: me }) => {
      setToken(token)
      queryClient.setQueryData(AUTH_QUERY_KEY, me)
      toast.success(`Welcome back, ${me.first_name}!`)
      if (me.role === 'admin') {
        navigate({ to: '/admin/' })
      } else {
        navigate({ to: '/dashboard/' })
      }
    },
    onError: () => {
      toast.error('Invalid email or password.')
    },
  })

  // ─── Register ─────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: ({ token, user: me }) => {
      setToken(token)
      queryClient.setQueryData(AUTH_QUERY_KEY, me)
      toast.success(`Welcome to Luggage Link, ${me.first_name}!`)
      navigate({ to: '/dashboard/' })
    },
    onError: () => {
      toast.error('Registration failed. This email may already be in use.')
    },
  })

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    clearToken()
    queryClient.clear()
    toast.success('You have been signed out.')
    navigate({ to: '/login' })
  }

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout,
  }
}
