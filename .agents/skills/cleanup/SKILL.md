---
name: cleanup
description: Run all code quality checks in sequence — React hooks best practices, React Query conventions, Python linting, and design token compliance. Use before shipping or reviewing a PR.
---

# Cleanup

Arguments:
- scope: what to review (default: your current changes). Examples: "diff to main", "src/features/", "apps/api/", "whole codebase"
- fix: whether to apply fixes (default: true). Set to false to only propose changes.

User arguments: $ARGUMENTS

## Steps

Run each of these checks in order on the specified scope. After each pass completes, move to the next. Do not skip any.

### 1. React Hooks Audit

Check for unnecessary `useEffect`, `useMemo`, `useCallback`, and `useState`:
- Remove effects that can be replaced with derived state or event handlers
- Remove memos that wrap cheap computations
- Remove callbacks that don't prevent re-renders in children
- Replace local fetch state with React Query (see step 2)

### 2. React Query Best Practices

Apply the `/react-query-best-practices` skill to all server-state code.

### 3. Python Linting

Run `make lint` from the repo root. This runs `ruff` with auto-fix for:
- Import ordering (isort-compatible)
- Unused imports
- Style violations
- Type annotation issues

Fix all `ruff` errors that require manual intervention.

### 4. TypeScript Type Check

Run `npx tsc --noEmit` from `apps/web/` and `packages/`. Fix all type errors.

### 5. Design Token Compliance

Check all frontend components for:
- Inline styles (`style={{...}}`) — replace with Tailwind classes
- Hardcoded color values (hex, rgb, hsl) — replace with design tokens from `DESIGN.md`
- Non-tokenized spacing values — use Tailwind scale
- Global style mutations — all styling must be local to components

Tokens reference: `DESIGN.md` and `packages/tailwind-config/tailwind.config.js`

### 6. Logger Usage

Check for:
- `print()` in Python — replace with `logger.error/info/warning` from `apps.api.app.core.logger`
- `console.log()` in TypeScript — replace with the unified logger utility
- Missing `exc_info=True` on `logger.error()` calls that catch exceptions

### 7. Import Convention

Check for:
- Relative imports in Python (`from .module import ...`) — replace with absolute imports
- Non-`@/` prefixed imports in TypeScript frontend — use `@/` alias

---

After all checks have run, output a summary of what was found and fixed (or proposed) across all passes.

## Boundary Audit Guidance (Frontend)

When replacing raw `fetch(` calls in hooks:
- Adopt contracts from `apps/web/src/lib/api/contracts/`
- Use the API client wrapper in `apps/web/src/lib/api/client.ts`
- Do NOT use `as unknown as X` double casts to bypass type errors — fix the underlying type
