# Phase 6 — Frontend: Pages & Routing

**Status: ⬜ Not Started**

---

## Goal

Complete frontend UI — login page, dashboard (workflow list), workflow editor with node property sidebar, execution log panel. All API calls use auth token. Full user flow works in browser.

## Prerequisites

- Phase 4 complete (nodes execute, API returns real data)
- `make dev` running (both API on :8000 and web on :5173)

---

## Architecture

```
apps/web/src/
├── app/
│   ├── App.tsx              ← root, wraps providers
│   ├── providers.tsx        ← QueryClientProvider + auth context
│   └── router.tsx           ← React Router routes
├── features/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   └── WorkflowCard.tsx
│   └── workflow-editor/
│       ├── Editor.tsx        ← main canvas (already exists, extend)
│       ├── NodePanel.tsx     ← left sidebar: node palette
│       ├── PropertyPanel.tsx ← right sidebar: selected node config
│       └── ExecutionPanel.tsx← bottom: execution logs
├── hooks/
│   ├── workflows/
│   │   ├── keys.ts          ← query key factory
│   │   └── queries.ts       ← useWorkflows, useWorkflow, useCreateWorkflow, etc.
│   └── executions/
│       ├── keys.ts
│       └── queries.ts
├── services/
│   ├── api.ts               ← axios instance with auth interceptor
│   ├── auth.ts              ← login(), register(), me()
│   └── workflows.ts         ← listWorkflows(), createWorkflow(), etc.
└── stores/
    └── auth.store.ts        ← token + user state
```

---

## Step 1: Axios Instance with Auth

**File:** `apps/web/src/services/api.ts`

```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## Step 2: Auth Service

**File:** `apps/web/src/services/auth.ts`

```typescript
import { api } from './api'

export interface User {
  id: string
  email: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export async function register(email: string, password: string): Promise<User> {
  const { data } = await api.post<User>('/auth/register', { email, password })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}
```

---

## Step 3: Auth Store

**File:** `apps/web/src/stores/auth.store.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
}

interface AuthState {
  token: string | null
  user: User | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setToken: (token) => {
        set({ token })
        localStorage.setItem('access_token', token)
      },
      setUser: (user) => set({ user }),
      logout: () => {
        set({ token: null, user: null })
        localStorage.removeItem('access_token')
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'fuse-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
```

---

## Step 4: Router

**File:** `apps/web/src/app/router.tsx`

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import { EditorPage } from '@/features/workflow-editor/EditorPage'
import { useAuthStore } from '@/stores/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/workflows/:id',
    element: (
      <ProtectedRoute>
        <EditorPage />
      </ProtectedRoute>
    ),
  },
])
```

---

## Step 5: App.tsx + providers.tsx

**File:** `apps/web/src/app/App.tsx`

```typescript
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { Providers } from './providers'

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
```

**File:** `apps/web/src/app/providers.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## Step 6: Query Key Factories

**File:** `apps/web/src/hooks/workflows/keys.ts`

```typescript
export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
}
```

**File:** `apps/web/src/hooks/executions/keys.ts`

```typescript
export const executionKeys = {
  all: ['executions'] as const,
  byWorkflow: (workflowId: string) => [...executionKeys.all, 'workflow', workflowId] as const,
  detail: (id: string) => [...executionKeys.all, 'detail', id] as const,
}
```

---

## Step 7: React Query Hooks

**File:** `apps/web/src/hooks/workflows/queries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowKeys } from './keys'
import { api } from '@/services/api'

export interface Workflow {
  id: string
  name: string
  description?: string
  graph: { nodes: any[]; edges: any[] }
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Workflow[]>('/workflows/', { signal })
      return data
    },
    staleTime: 1000 * 60,
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Workflow>(`/workflows/${id}`, { signal })
      return data
    },
    staleTime: 1000 * 30,
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post<Workflow>('/workflows/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Workflow>) => {
      const response = await api.put<Workflow>(`/workflows/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}

export function useRunWorkflow() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ execution_id: string }>(`/workflows/${id}/run`)
      return data
    },
  })
}
```

---

## Step 8: Login Page

**File:** `apps/web/src/features/auth/LoginPage.tsx`

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/auth'
import { useAuthStore } from '@/stores/auth.store'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await login(email, password)
      setToken(access_token)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Sign in to Fuse</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

---

## Step 9: Dashboard Page

**File:** `apps/web/src/features/dashboard/DashboardPage.tsx`

```typescript
import { useNavigate } from 'react-router-dom'
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow } from '@/hooks/workflows/queries'
import { useAuthStore } from '@/stores/auth.store'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { data: workflows, isLoading } = useWorkflows()
  const createWorkflow = useCreateWorkflow()
  const deleteWorkflow = useDeleteWorkflow()

  async function handleCreate() {
    const workflow = await createWorkflow.mutateAsync({ name: 'Untitled Workflow' })
    navigate(`/workflows/${workflow.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Fuse</h1>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700">
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Workflows</h2>
          <button
            onClick={handleCreate}
            disabled={createWorkflow.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createWorkflow.isPending ? 'Creating...' : '+ New Workflow'}
          </button>
        </div>

        {isLoading && <p className="text-slate-500">Loading...</p>}

        <div className="grid gap-4">
          {workflows?.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <h3
                  className="font-medium text-slate-900 cursor-pointer hover:text-blue-600"
                  onClick={() => navigate(`/workflows/${workflow.id}`)}
                >
                  {workflow.name}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {workflow.graph.nodes.length} nodes · Updated {new Date(workflow.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/workflows/${workflow.id}`)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteWorkflow.mutate(workflow.id)}
                  className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {workflows?.length === 0 && (
            <p className="text-slate-500 text-center py-12">No workflows yet. Create your first one.</p>
          )}
        </div>
      </main>
    </div>
  )
}
```

---

## Step 10: Editor Page + Property Panel

**File:** `apps/web/src/features/workflow-editor/EditorPage.tsx`

```typescript
import { useParams } from 'react-router-dom'
import { useWorkflow, useUpdateWorkflow, useRunWorkflow } from '@/hooks/workflows/queries'
import Editor from './Editor'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const { data: workflow, isLoading } = useWorkflow(id!)
  const updateWorkflow = useUpdateWorkflow(id!)
  const runWorkflow = useRunWorkflow()

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!workflow) return <div>Workflow not found</div>

  return (
    <Editor
      workflow={workflow}
      onSave={(graph) => updateWorkflow.mutateAsync({ graph })}
      onRun={() => runWorkflow.mutateAsync(id!)}
      isSaving={updateWorkflow.isPending}
      isRunning={runWorkflow.isPending}
    />
  )
}
```

Update `Editor.tsx` to accept these props and wire the Save/Run buttons.

---

## Checklist

- [ ] `api.ts` axios instance created with `baseURL` from `VITE_API_BASE_URL`
- [ ] `api.ts` request interceptor attaches `Authorization: Bearer <token>`
- [ ] `api.ts` response interceptor redirects to `/login` on 401
- [ ] `useAuthStore` uses `zustand/middleware` `persist` — token survives page refresh
- [ ] `router.tsx` has `/login`, `/dashboard`, `/workflows/:id` routes
- [ ] `ProtectedRoute` redirects unauthenticated users to `/login`
- [ ] `App.tsx` wraps `RouterProvider` in `Providers`
- [ ] `QueryClient` configured with `retry: 1`, `refetchOnWindowFocus: false`
- [ ] All query hooks use key factory (`workflowKeys.*`)
- [ ] All query hooks have explicit `staleTime`
- [ ] All query hooks forward `signal` to API call
- [ ] All mutations invalidate relevant query keys on success
- [ ] Login page: submit calls `login()`, stores token, navigates to `/dashboard`
- [ ] Login page: shows error message on bad credentials
- [ ] Dashboard: lists workflows from `useWorkflows()`
- [ ] Dashboard: "New Workflow" creates + navigates to editor
- [ ] Dashboard: delete button removes workflow
- [ ] Editor: "Save Workflow" button calls `updateWorkflow`
- [ ] Editor: "Run" button calls `runWorkflow`, shows execution ID feedback
- [ ] `VITE_API_BASE_URL` added to `.env`
- [ ] No `console.log()` anywhere
- [ ] `npx tsc --noEmit` passes (run from `apps/web/`)
- [ ] `make lint` passes

---

## Acceptance Criteria

1. Open `http://localhost:5173` → redirected to `/login`
2. Enter credentials → redirected to `/dashboard`
3. See workflow list
4. Click "New Workflow" → navigated to editor
5. Drag HTTP Request node onto canvas
6. Click node → property panel opens
7. Fill in URL field
8. Click "Save" → no error, workflow saved
9. Click "Run" → execution_id shown
10. Refresh page → still logged in (persisted token)
11. Click "Sign out" → redirected to login

---

## Common Mistakes

- Forgetting `RouterProvider` wrapping — router doesn't work
- `useNavigate` outside router context — crashes. Use inside route components only
- `zustand persist` without `partialize` — stores entire state including functions (fails serialize)
- Query key factory not used consistently — cache invalidation misses
- `signal` not forwarded — requests don't cancel on unmount (memory leaks)
- `VITE_API_BASE_URL` not in `.env` — axios falls back to localhost, breaks in production
