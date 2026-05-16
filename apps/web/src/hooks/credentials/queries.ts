import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { credentialKeys } from '@/hooks/credentials/keys'
import { requestJson } from '@/lib/api/client'
import {
  CredentialSchema,
  OAuthUrlResponseSchema,
} from '@/lib/api/contracts'

const CredentialListSchema = z.array(CredentialSchema)

export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.lists(),
    queryFn: async ({ signal }) => {
      return requestJson(CredentialListSchema, {
        url: '/credentials/',
        method: 'GET',
        signal,
      })
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; type: string; data: Record<string, any>; meta?: Record<string, any> }) => {
      return requestJson(CredentialSchema, {
        url: '/credentials/',
        method: 'POST',
        data,
      })
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
      await requestJson(z.any(), {
        url: `/credentials/${id}`,
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.lists() })
    },
  })
}

export function useOAuthUrl(serviceName: string) {
  return useQuery({
    queryKey: ['oauth-url', serviceName],
    queryFn: async ({ signal }) => requestJson(OAuthUrlResponseSchema, {
      url: `/credentials/oauth/${serviceName}/url`,
      method: 'GET',
      signal,
    }),
    enabled: !!serviceName,
    staleTime: 0, // State should be fresh
  })
}
