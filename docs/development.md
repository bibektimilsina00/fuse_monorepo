# Development Guide

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | ≥ 3.13 | [python.org](https://python.org) or `pyenv` |
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) or `nvm` |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker | latest | [docker.com](https://docker.com) |

## First-Time Setup

```bash
# 1. Install all dependencies
make setup

# 2. Configure environment
cp .env.example .env
# Edit .env — generate secrets with:
openssl rand -hex 32   # for SECRET_KEY
openssl rand -hex 32   # for ENCRYPTION_KEY

# 3. Start infrastructure (PostgreSQL + Redis)
make db-up

# 4. Run database migrations
make migrate

# 5. Start all dev servers
make dev
```

After `make dev`:
- API: http://localhost:8000
- API docs: http://localhost:8000/api/v1/openapi.json
- Frontend: http://localhost:5173

## Daily Commands

| Command | What it does |
|---|---|
| `make dev` | Start API + Worker + Web in parallel |
| `make db-up` | Start PostgreSQL + Redis via Docker |
| `make migrate` | Run pending Alembic migrations |
| `make lint` | Run ruff (Python) + eslint (TypeScript) |
| `make type-check` | TypeScript type check (tsc --noEmit) |

## Adding a Database Migration

```bash
cd apps/api
uv run alembic revision --autogenerate -m "describe the change"
# Review the generated file in alembic/versions/
uv run alembic upgrade head
```

## Project Conventions

### Backend (Python)
- **Imports**: absolute only — `from apps.api.app.services.workflow_service import WorkflowService`
- **Logger**: `from apps.api.app.core.logger import get_logger; logger = get_logger(__name__)`
- **Never**: `print()`, relative imports (`from .module import ...`)
- **Style**: PascalCase classes, snake_case functions/files, SCREAMING_SNAKE for constants
- **Layer**: Router → Service → Repository. No DB access in routers.

### Frontend (TypeScript)
- **Imports**: use `@/` alias — `import { useWorkflowStore } from '@/stores/workflowStore'`
- **Logger**: never `console.log` — use a logger utility
- **Style**: PascalCase components, `useX` hooks, kebab-case files
- **State**: Zustand for UI state, React Query for server state

### Shared
- **IDs**: UUID v4 everywhere — `uuid.uuid4()` (Python), `crypto.randomUUID()` (TypeScript)
- **Styling**: Tailwind only — no inline styles, no hardcoded hex colors
- **Lint**: `make lint` must pass before every PR

## Running Tests

```bash
# Backend
cd apps/api
uv run pytest

# Frontend
cd apps/web
pnpm test
```

## Environment Variables

See `.env.example` for the full list. Critical ones:

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing key (32 hex bytes) |
| `ENCRYPTION_KEY` | Yes | Fernet credential encryption key (32 hex bytes) |
| `POSTGRES_*` | Yes | PostgreSQL connection |
| `REDIS_HOST/PORT` | Yes | Redis connection |
| `SLACK_CLIENT_ID/SECRET` | For Slack nodes | OAuth app credentials |
| `GITHUB_CLIENT_ID/SECRET` | For GitHub nodes | OAuth app credentials |
| `VITE_API_BASE_URL` | Frontend | API base URL |

## Troubleshooting

**API won't start — `ImportError` on router**
→ Check that all router files in `apps/api/app/api/v1/*/router.py` define a `router = APIRouter()`.

**`make migrate` fails — can't connect to DB**
→ Run `make db-up` first to start PostgreSQL.

**Worker not processing tasks**
→ Check Redis is running (`docker ps`). Check `REDIS_HOST` in `.env`.

**Frontend can't reach API**
→ Check `VITE_API_BASE_URL` in `.env` matches the running API port.
