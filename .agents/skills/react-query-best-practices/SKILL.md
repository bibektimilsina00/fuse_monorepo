---
name: react-query-best-practices
description: Audit and fix React Query usage in apps/web — enforce query key factories, signal forwarding, staleTime, and proper mutation patterns. Use when reviewing or fixing server-state code.
---

# React Query Best Practices Skill

You are an expert at React Query in the Fuse frontend (`apps/web/`). Audit and fix all server-state code to follow Fuse conventions.

## Core Rule

**All server state must go through React Query.** Never use `useState` + `fetch` or `useEffect` + `fetch` for data fetching.

## Rule 1: Query Key Factories

Every feature must have a hierarchical key factory. This enables targeted cache invalidation.

```typescript
// apps/web/src/hooks/workflows/keys.ts
export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters: WorkflowFilters) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
}

// Usage in query
useQuery({
  queryKey: workflowKeys.detail(id),
  queryFn: ({ signal }) => fetchWorkflow(id, signal),
})
```

**Violations to fix:**
- Inline string arrays: `queryKey: ['workflows', id]` → use factory
- Missing factory for any feature with more than one query

## Rule 2: Signal Forwarding

Always forward the `AbortSignal` to enable request cancellation.

```typescript
// Good
useQuery({
  queryKey: workflowKeys.detail(id),
  queryFn: ({ signal }) => fetchWorkflow(id, signal),
})

// Also accept signal in service functions
async function fetchWorkflow(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/v1/workflows/${id}`, { signal })
  return response.json()
}
```

**Violations to fix:**
- `queryFn: () => fetchWorkflow(id)` (no signal) — add `({ signal })`
- Service functions that don't accept `signal` — add `signal?: AbortSignal` param

## Rule 3: Explicit staleTime

Every query must have an explicit `staleTime`. Never rely on the default (0).

```typescript
// Feature-appropriate stale times:
staleTime: 1000 * 60 * 5    // 5 minutes — user profile, settings
staleTime: 1000 * 60        // 1 minute — workflow list
staleTime: 1000 * 30        // 30 seconds — execution logs
staleTime: 0                // Always fresh — only when truly needed
```

**Violations to fix:**
- Any `useQuery` without `staleTime` — add appropriate value based on data type

## Rule 4: No useState + fetch

Replace raw data fetching with React Query.

```typescript
// Bad
const [workflows, setWorkflows] = useState([])
const [loading, setLoading] = useState(false)
useEffect(() => {
  setLoading(true)
  fetch('/api/v1/workflows').then(r => r.json()).then(data => {
    setWorkflows(data)
    setLoading(false)
  })
}, [])

// Good
const { data: workflows, isLoading } = useQuery({
  queryKey: workflowKeys.lists(),
  queryFn: ({ signal }) => fetchWorkflows(signal),
  staleTime: 1000 * 60,
})
```

## Rule 5: Mutation Patterns

Use `useMutation` for all write operations. Invalidate related queries on success.

```typescript
const createWorkflow = useMutation({
  mutationFn: (data: CreateWorkflowInput) => apiCreateWorkflow(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
  },
  onError: (error) => {
    // Handle error — show toast, etc.
  },
})
```

**Violations to fix:**
- Manual `fetch` POST/PUT/DELETE calls — wrap in `useMutation`
- Mutations without `onSuccess` cache invalidation — add `invalidateQueries`

## Rule 6: Zustand vs React Query

- **React Query**: all server state (anything fetched from the API)
- **Zustand**: all client-only UI state (selected items, panel open/closed, canvas state)

**Never store server data in Zustand.** Don't copy API response data into Zustand stores.

## Audit Checklist

For the specified scope:
- [ ] All data-fetching `useEffect` hooks replaced with `useQuery`
- [ ] All query keys use a factory function
- [ ] All `queryFn` functions forward `signal`
- [ ] All queries have explicit `staleTime`
- [ ] All write operations use `useMutation`
- [ ] All mutations invalidate related query keys on success
- [ ] No server state stored in Zustand
- [ ] No `useState` + `fetch` patterns

## Output

After auditing, report:
1. All violations found (file, line, issue type)
2. All fixes applied (if `fix: true`)
3. Any violations that required manual intervention
