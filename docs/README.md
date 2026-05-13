# Fuse Documentation

## Project Plan

→ **[project-plan.md](project-plan.md)** — complete phase-by-phase build order with checklists

---

## Quick Start

```bash
make setup && cp .env.example .env
# Edit .env — generate secrets: openssl rand -hex 32
make db-up && make migrate && make dev
```

## Docs

| Section | Contents |
|---|---|
| [Architecture Overview](architecture/overview.md) | System diagram, monorepo structure, design principles |
| [Tech Stack](architecture/stack.md) | Technology choices and rationale |
| [Development Guide](development.md) | Setup, commands, conventions, troubleshooting |
| [Workflow Overview](workflows/overview.md) | Graph schema, execution model, DB models |
| [Node System](nodes/overview.md) | Categories, property types, builtin nodes |
| [Creating Nodes](nodes/creating-nodes.md) | Step-by-step guide with full examples |
| [Integrations Overview](integrations/overview.md) | Pattern, existing integrations, credential types |
| [Adding Integrations](integrations/adding-integrations.md) | Step-by-step guide with full examples |
| [Execution Engine](execution-engine/overview.md) | DAG execution, NodeContext, event bus |
| [API Endpoints](api/endpoints.md) | All HTTP endpoints with request/response examples |
| [WebSocket](api/websocket.md) | Real-time execution streaming |

## Agent Skills (`.agents/skills/`)

| Skill | When to use |
|---|---|
| `/add-node` | Create a new node (frontend + backend) |
| `/add-integration` | Add a complete service integration |
| `/add-trigger` | Add webhook trigger support |
| `/validate-node` | Audit an existing node |
| `/validate-trigger` | Audit an existing trigger |
| `/cleanup` | Code quality sweep before PR |
| `/ship` | Commit + push + open PR |
| `/react-query-best-practices` | Fix React Query usage |
