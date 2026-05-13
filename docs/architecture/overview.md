# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│   ReactFlow canvas  │  Dashboard  │  Credentials UI  │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────┐
│                  FastAPI (apps/api)                  │
│   Auth  │  Workflows  │  Executions  │  Credentials  │
│   Node Registry  │  Execution Engine  │  WebSocket   │
└──────────────┬──────────────────────────────────────┘
               │ Redis (Celery tasks)
┌──────────────▼──────────────────────────────────────┐
│              Celery Worker (apps/worker)             │
│   Workflow Job  │  Browser Job  │  AI Job            │
│   Playwright  │  Node Executors  │  Sandboxing       │
└─────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              Infrastructure                          │
│   PostgreSQL (state)  │  Redis (broker + cache)      │
└─────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
apps/
├── api/                        # FastAPI backend
│   └── app/
│       ├── api/v1/             # HTTP routers
│       ├── core/               # Config, DB, Redis, Celery, logger, security
│       ├── credential_manager/ # AES-256 vault, OAuth flows, token rotation
│       ├── execution_engine/   # DAG orchestration, event bus, scheduler
│       ├── integrations/       # Per-service API clients + services
│       ├── models/             # SQLAlchemy ORM models
│       ├── node_system/        # BaseNode, NodeRegistry, builtin executors
│       ├── repositories/       # DB access layer
│       ├── schemas/            # Pydantic request/response contracts
│       └── services/           # Business logic layer
├── worker/                     # Celery worker process
│   └── app/
│       ├── browser/            # Playwright pool + session management
│       ├── execution/          # Node execution runtime
│       └── jobs/               # Celery task definitions
└── web/                        # Vite + React frontend
    └── src/
        ├── app/                # Router, providers, App.tsx
        ├── features/           # workflow-editor, dashboard, etc.
        ├── nodes/              # Re-exports from packages/node-definitions
        ├── services/           # API client functions
        └── stores/             # Zustand stores

packages/
├── node-definitions/           # Shared TypeScript NodeDefinition registry
├── workflow-schema/            # Shared workflow/execution types
├── tailwind-config/            # Shared design tokens
└── typescript-config/          # Shared tsconfig base
```

## Core Design Principles

1. **Single Responsibility** — each layer has one job: Router routes, Service has logic, Repository touches DB.
2. **Schema-Driven** — `packages/workflow-schema` is the source of truth for runtime contracts.
3. **Layered Separation** — API: Router → Service → Repository. Worker: Task → Runtime → Executor.
4. **Predictable State** — Zustand for UI state, React Query for server state. Never mix.

## Package Boundaries

- `apps/*` → `packages/*` only. Packages never import from `apps/*`.
- `apps/worker` must not directly import from `apps/api`. Shared types live in `packages/workflow-schema`.
- All cross-service communication goes through Redis (Celery) or PostgreSQL.

## Credential Security Model

All OAuth tokens and API keys are encrypted at rest using **AES-256 (Fernet)**. Flow:

1. User initiates OAuth → `credential_manager/oauth/flow.py` redirects to provider
2. Callback received → token encrypted and stored via `credential_manager/vault/`
3. At execution time → token decrypted and injected into `NodeContext.credentials`
4. Node executor accesses `context.credentials.get('slack_oauth')` — never touches DB

Tokens are auto-rotated by `credential_manager/rotation/scheduler.py` before expiry.
