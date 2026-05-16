import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { credentialKeys } from './keys'
import api from '@/lib/api/client'

export interface Credential {
  id: string
  name: string
  type: string
  meta?: Record<string, any>
  created_at: string
  updated_at: string
}

export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.lists(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Credential[]>('/credentials/', { signal })
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; type: string; data: Record<string, any>; meta?: Record<string, any> }) => {
      const response = await api.post<Credential>('/credentials/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

export function useDeleteCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/credentials/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

export function useOAuthUrl(serviceName: string) {
  return useQuery({
    queryKey: ['oauth-url', serviceName],
    queryFn: async () => {
      const { data } = await api.get<{ url: string; state: string }>(`/credentials/oauth/${serviceName}/url`)
      return data
    },
    enabled: !!serviceName,
    staleTime: 0, // State should be fresh
  })
}
