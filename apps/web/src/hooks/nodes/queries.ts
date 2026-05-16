import { useQuery } from '@tanstack/react-query'
import { nodeKeys } from './keys'
import api from '@/lib/api/client'
import type { NodeDefinition } from '@fuse/node-definitions'

export function useNodes() {
  return useQuery({
    queryKey: nodeKeys.lists(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<NodeDefinition[]>('/nodes/', { signal })
      return data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
