import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authKeys } from './keys'
import { login, register, getMe, forgotPassword, resetPassword } from '@/services/auth'
import type { LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest } from '@/services/auth'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Hook for user login.
 */
export function useLogin() {
  const navigate = useNavigate()
  const { setToken } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (data) => {
      setToken(data.access_token)
      queryClient.invalidateQueries({ queryKey: authKeys.me() })
      navigate('/dashboard')
    },
  })
}

/**
 * Hook for user registration.
 */
export function useRegister() {
  const navigate = useNavigate()
  const { setToken } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      await register(data)
      return login({ email: data.email, password: data.password })
    },
    onSuccess: (data) => {
      setToken(data.access_token)
      queryClient.invalidateQueries({ queryKey: authKeys.me() })
      navigate('/dashboard')
    },
  })
}

/**
 * Hook for fetching current user profile.
 */
export function useMe() {
  const { isAuthenticated, setUser, logout } = useAuthStore()
  
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }) => {
      try {
        const user = await getMe()
        setUser(user)
        return user
      } catch (error: any) {
        if (error.response?.status === 401) {
          logout()
        }
        throw error
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook for password reset request.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => forgotPassword(data),
  })
}

/**
 * Hook for actual password reset.
 */
export function useResetPassword() {
  const navigate = useNavigate()
  
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => resetPassword(data),
    onSuccess: () => {
      navigate('/login')
    },
  })
}
