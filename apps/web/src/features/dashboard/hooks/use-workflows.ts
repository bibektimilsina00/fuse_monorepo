import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import { WorkflowSchema, type Workflow } from '@/lib/api/contracts'
import { workflowKeys } from './keys'

const WorkflowListSchema = z.array(WorkflowSchema)

export const DEFAULT_WORKFLOW_ID = '9394eafe-d181-4a1f-a669-91c0db6211c'

export const DEFAULT_WORKFLOW: Workflow = {
  id: DEFAULT_WORKFLOW_ID,
  name: 'default-agent',
  description: 'A default starting point for your automation.',
  status: 'active',
  graph: { nodes: [], edges: [] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Hook to fetch all workflows for the dashboard list.
 * Includes a fallback to a default workflow if the list is empty.
 */
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: async ({ signal }) => {
      const workflows = await requestJson(WorkflowListSchema, {
        url: '/workflows/',
        method: 'GET',
        signal,
      })
      
      // Fallback logic: if no workflows exist, provide the default agent
      if (workflows.length === 0) {
        return [DEFAULT_WORKFLOW]
      }
      
      return workflows
    },
    staleTime: 1000 * 60,
  })
}
