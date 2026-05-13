import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import { WorkflowSchema } from '@/lib/api/contracts'
import { workflowKeys } from './keys'

const WorkflowListSchema = z.array(WorkflowSchema)

/**
 * Hook to fetch all workflows for the dashboard list.
 * Follows Rule #1 (Keys), #2 (Signal), and #3 (StaleTime).
 */
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: ({ signal }) => 
      requestJson(WorkflowListSchema, {
        url: '/workflows/',
        method: 'GET',
        signal,
      }),
    staleTime: 1000 * 60, // 1 minute stale time for the list
  })
}
