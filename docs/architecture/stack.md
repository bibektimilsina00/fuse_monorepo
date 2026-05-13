# Tech Stack

## Backend

| Layer | Technology | Why |
|---|---|---|
| API framework | FastAPI | Async-native, automatic OpenAPI, Pydantic integration |
| ORM | SQLAlchemy (async) | Mature, type-safe, async support via asyncpg |
| Migrations | Alembic | Schema versioning, auto-generation from models |
| Task queue | Celery + Redis | Distributed execution, retry logic, task routing |
| Encryption | cryptography (Fernet) | AES-256 for credential vault |
| Auth | python-jose + passlib | JWT tokens, bcrypt password hashing |
| HTTP client | httpx | Async-first, same API as requests |
| Browser automation | Playwright | Headless Chrome, stealth mode, session pooling |
| Dependency management | uv | Fast, lock-file based, replaces pip/poetry |

## Frontend

| Layer | Technology | Why |
|---|---|---|
| Build tool | Vite | Fast HMR, ESM-native |
| UI framework | React 18 | Concurrent features, ecosystem |
| Canvas | ReactFlow | Drag-and-drop workflow editor |
| State (UI) | Zustand | Minimal, no boilerplate |
| State (server) | TanStack Query v5 | Caching, background refetch, optimistic updates |
| Styling | Tailwind CSS | Utility-first, design tokens via config |
| Forms/validation | Zod | Runtime type validation, matches backend Pydantic |
| HTTP | axios | Interceptors for auth headers |
| Package manager | pnpm | Fast, monorepo workspaces |

## Infrastructure

| Service | Version | Purpose |
|---|---|---|
| PostgreSQL | 15 | Primary database |
| Redis | 7 | Celery broker + result backend + pub/sub |
| Docker | latest | Local infrastructure via docker-compose |

## Monorepo

| Tool | Purpose |
|---|---|
| Turborepo | Build orchestration, caching |
| pnpm workspaces | Package linking |
| uv workspaces | Python package management |
