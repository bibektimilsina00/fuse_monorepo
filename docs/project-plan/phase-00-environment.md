# Phase 0 — Environment Running

**Status: ✅ DONE**

---

## Goal

`make dev` starts without errors. API responds. DB is migrated. Frontend loads in browser.

## Prerequisites

None — this is the first phase.

## What Was Done

### Dependencies installed
```bash
make setup
# runs: pnpm install + cd apps/api && uv sync + cd apps/worker && uv sync
```

### Environment configured
```bash
cp .env.example .env
# then filled in:
# SECRET_KEY=<openssl rand -hex 32>
# ENCRYPTION_KEY=<openssl rand -hex 32>
```

### Infrastructure started
```bash
make db-up
# starts PostgreSQL on :5432 and Redis on :6379 via docker-compose
```

### Database migrated
```bash
make migrate
# runs: cd apps/api && PYTHONPATH=../.. uv run alembic upgrade head
```

### Fixes applied during this phase
- `turbo.json` was empty — filled with valid tasks config
- `pnpm-workspace.yaml` had invalid `allowBuilds` — fixed to `onlyBuiltDependencies: [esbuild]`
- `package.json` missing `packageManager` field — added `"packageManager": "pnpm@11.1.1"`
- Node version upgraded to 24 (pnpm 11 requires ≥22)
- `main.tsx` imported `./App.tsx` but file is at `./app/App.tsx` — fixed
- `workflowStore.ts` had runtime import of TypeScript types from reactflow — fixed to `import type`
- `packages/node-definitions/package.json` missing — created
- `apps/web/package.json` missing `@fuse/node-definitions` dep — added `workspace:*`

## Acceptance Criteria (Verified)

```bash
# API alive
curl http://localhost:8000/
# → {"message":"Welcome to Fuse API","version":"1.0.0"}

# OpenAPI spec available
curl http://localhost:8000/api/v1/openapi.json | head -5

# Frontend loads
open http://localhost:5173
# → ReactFlow canvas visible, no console errors
```
