import { z } from 'zod'

/**
 * Helper to define a standard API contract.
 * Used to keep frontend and backend schemas in sync.
 */
export function defineRouteContract<
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TResponse extends z.ZodTypeAny = z.ZodTypeAny
>(contract: {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: TBody
  response: TResponse
}) {
  return contract
}

// Example contract: Workflow
export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.string(), // Changed to string for flexibility
  graph: z.record(z.string(), z.any()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Workflow = z.infer<typeof WorkflowSchema>
