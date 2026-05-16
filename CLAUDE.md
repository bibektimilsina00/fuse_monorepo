# Fuse — Project Instructions for Claude

## Fix discipline (mandatory, no exceptions)

Before fixing any bug, error, or type mismatch:

1. State the **root cause** — where the wrong thing originates, not where it surfaces
2. State the **lazy fix** that you are rejecting
3. State the **correct fix** and which files it touches
4. Fix at the source. Never at the consumer.

**Banned patterns — never produce these:**
- `as any`, `# type: ignore`, `@ts-ignore`
- Casting a value to match a wrong type instead of fixing the type
- Adding `if node.type === 'X'` checks inside generic code
- `try/except: pass` to suppress an error
- Duplicating logic instead of fixing the shared abstraction
- Null checks that hide a missing value instead of fixing why it's missing
- Special-casing one call site instead of fixing the contract

If you catch yourself writing any of the above — stop, re-diagnose, fix upstream.

---

## Architecture rules

- **Nodes**: `CustomNode` is for fixed-output nodes. `ConditionNode` is for dynamic per-row output handles. Never add node-type checks inside either.
- **Inspector**: All field visibility logic lives in `panels/inspector/visibility.ts`. Never add visibility checks inside field renderers.
- **Theming**: All colors via CSS variables (`var(--token)`) or Tailwind tokens (`bg-surface-2`). Never hardcode hex values.
- **Components**: Reuse `components/ui/` (Button, Input, Modal, Spinner, Alert, IconButton, ThemeToggle). Never re-implement inline.
- **Backend layers**: Router → Service → Repository → Model. Logic belongs in Service. Routers only wire HTTP. Repositories only do DB queries.

---

## Skills available

| `/skill` | Purpose |
|---|---|
| `/new-node` | Scaffold workflow node (backend + frontend) |
| `/new-integration` | OAuth or API key credential provider |
| `/new-api-feature` | Backend feature (model → repo → service → router) |
| `/new-feature` | Frontend feature (hooks → page → route) |
| `/new-ui-component` | `components/ui/` component |
| `/db-migrate` | Alembic migration generate + apply |
| `/debug-workflow` | Trace failing execution to root cause |
