# Fuse Development Guidelines

You are a professional software engineer. All code must follow best practices: accurate, readable, clean, and efficient.

## Global Standards

- **Linting / Audit**: `make lint` must pass on PRs. This includes `ruff` for Python and `eslint` for TypeScript.
- **Logging**: 
    - **Backend**: Use the central logger from `apps.api.app.core.logger`. Never use `print()`.
    - **Frontend**: Use a unified logger utility. Never use `console.log`.
- **Comments**: Use Google-style docstrings for Python and TSDoc for TypeScript. No `====` separators.
- **Styling**: Never update global styles. Keep all styling local to components or defined in `DESIGN.md` tokens.
- **ID Generation**: Use UUID v4 for all primary identifiers. 
    - Backend: `uuid.uuid4()`.
    - Frontend: `crypto.randomUUID()`.
- **Package Managers**: 
    - **Frontend**: Use `pnpm`.
    - **Backend**: Use `uv` for dependency management.

## Architecture

### Core Principles

1. **Single Responsibility**: Each component, service, or repository has one clear purpose.
2. **Layered Separation**: 
    - **API**: Router → Service → Repository.
    - **Worker**: Task → Runtime → Executor.
3. **Schema-Driven**: The `packages/workflow-schema` is the single source of truth for runtime contracts.
4. **Predictable State**: Zustand for global UI state, React Query for server state.

### Root Structure

```text
apps/
├── api/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/         # Versioned routers
│   │   ├── core/           # Security, DB, Redis, Config, Logger
│   │   ├── execution_engine/# DAG orchestration logic
│   │   ├── integrations/   # External API clients
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic contracts
│   │   └── services/       # Business logic layer
├── worker/                 # Celery Worker
│   ├── app/
│   │   ├── browser/        # Playwright automation
│   │   ├── execution/      # Isolated execution runtime
│   │   └── jobs/           # Task consumers
└── web/                    # Vite + React Frontend
    └── src/
        ├── app/            # Providers, Layouts, App.tsx
        ├── components/     # Shared UI components
        ├── features/       # Feature-based modules (editor, dashboard)
        ├── hooks/          # Shared hooks (queries, selectors)
        └── stores/         # Zustand stores

packages/
├── workflow-schema/        # Shared TS/Python types for the engine
├── node-definitions/       # Registry of node metadata and UI schemas
└── tailwind-config/        # Shared design tokens
```

### Package boundaries

- `apps/* → packages/*` only. Packages never import from `apps/*`.
- `apps/worker` intentionally avoids React and UI logic. It focuses purely on runtime execution and browser automation.
- Auth is shared via a centralized `SecurityService` and consistent session management across API and Worker.

### Naming Conventions

- **Frontend (React)**:
    - Components: `PascalCase` (`WorkflowList`)
    - Hooks: `use` prefix (`useWorkflow`)
    - Files: `kebab-case` (`workflow-list.tsx`)
    - Interfaces: `PascalCase` with suffix (`WorkflowListProps`)
- **Backend (Python)**:
    - Classes: `PascalCase` (`WorkflowService`)
    - Functions/Variables: `snake_case` (`create_workflow`)
    - Files: `snake_case` (`workflow_service.py`)
    - Constants: `SCREAMING_SNAKE_CASE`

## Imports

**Always use absolute imports.** Never use relative imports.

```typescript
// ✓ Good (Frontend)
import { useWorkflowStore } from '@/stores/workflows/store'

// ✓ Good (Backend)
from apps.api.app.services.workflow_service import WorkflowService
```

## API Contracts

Boundary HTTP request and response shapes are defined using **Pydantic** on the backend and **Zod** on the frontend. They must be kept in sync.

1. **Define the Schema (Backend)**: Create a Pydantic model in `apps/api/app/schemas/`.
2. **Define the Contract (Frontend)**: Create a matching Zod schema in `apps/web/src/lib/api/contracts/`.
3. **Validation**:
    - Backend: FastAPI automatically validates inputs against Pydantic models.
    - Frontend: `requestJson` (wrapper) validates the JSON response against the Zod contract.

### Schema review checklist

- **Required vs Optional**: Correctly use `Optional[T]` in Python and `.optional()` in Zod.
- **Types**: Ensure types match (e.g., Python `datetime` -> TS `string` with ISO format).
- **Bounds**: Set constraints like `min_length`, `max_length`, `ge` (greater than or equal).

## React Query Best Practices

All server state must go through React Query. Never use `useState` + `fetch` for data fetching.

- **Query Key Factory**: Every feature must have a hierarchical key factory.
- **Signal Forwarding**: Always forward the `AbortSignal` for request cancellation.
- **Stale Time**: Every query must have an explicit `staleTime`.

## Backend Service Pattern

```python
# apps/api/app/services/base.py
class BaseService:
    def __init__(self, db: AsyncSession):
        self.db = db

# apps/api/app/services/workflow_service.py
class WorkflowService(BaseService):
    async def create_workflow(self, schema: WorkflowCreate) -> Workflow:
        # logic here
        pass
```

## Styling

- Use **Tailwind CSS** only. No inline styles.
- Use the `cn()` utility for conditional classes.
- Follow the tokens defined in `DESIGN.md`.

## Testing

- **Backend**: Use `pytest` and `httpx.AsyncClient`.
- **Frontend**: Use `Vitest` and `React Testing Library`.
- Mock external integrations using a unified `MockRegistry`.
