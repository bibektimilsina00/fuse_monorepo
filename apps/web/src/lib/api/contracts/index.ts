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
  user_id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  schema_version: z.string().optional(),
  is_active: z.boolean().optional(),
  status: z.string().optional(),
  folder_id: z.string().uuid().optional().nullable(),
  position: z.number().optional(),
  color: z.string().optional().nullable(),
  graph: z.any().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Workflow = z.infer<typeof WorkflowSchema>

export const WorkflowBatchItemSchema = z.object({
  id: z.string().uuid(),
  folder_id: z.string().uuid().optional().nullable(),
  position: z.number().optional().nullable(),
  color: z.string().optional().nullable(),
})

export const WorkflowBatchUpdateSchema = z.object({
  updates: z.array(WorkflowBatchItemSchema),
})

export type WorkflowBatchUpdate = z.infer<typeof WorkflowBatchUpdateSchema>

export const FolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parent_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Folder = z.infer<typeof FolderSchema>
