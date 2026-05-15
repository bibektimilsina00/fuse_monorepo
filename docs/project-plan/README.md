# Fuse — Project Plan Index

> Work through phases in number order — 0, 1, 2, 3 ... 27.
> Phase numbers now match the correct build order.
> A phase is DONE only when every checklist box is checked AND acceptance criteria passes.

## Status

| Phase | File | Area | Status |
|---|---|---|---|
| 0 | [phase-00-environment.md](phase-00-environment.md) | Setup | ✅ Done |
| 1 | [phase-01-authentication.md](phase-01-authentication.md) | Auth | ✅ Done |
| 2 | [phase-02-workflow-crud.md](phase-02-workflow-crud.md) | Core | ✅ Done |
| 3 | [phase-03-execution-pipeline.md](phase-03-execution-pipeline.md) | Core | ✅ Done |
| 4 | [phase-04-first-nodes.md](phase-04-first-nodes.md) | Nodes | ✅ Done |
| 5 | [phase-05-variable-interpolation.md](phase-05-variable-interpolation.md) | Core | ✅ Done |
| 6 | [phase-06-frontend-pages.md](phase-06-frontend-pages.md) | Frontend | ✅ Done |
| 7 | [phase-07-credentials.md](phase-07-credentials.md) | Auth | 🔄 In Progress |
| 8 | [phase-08-slack-integration.md](phase-08-slack-integration.md) | Integration | ⬜ |
| 9 | [phase-09-websocket-streaming.md](phase-09-websocket-streaming.md) | Realtime | ⬜ |
| 10 | [phase-10-more-nodes.md](phase-10-more-nodes.md) | Nodes | ⬜ |
| 11 | [phase-11-more-integrations.md](phase-11-more-integrations.md) | Integration | ⬜ |
| 12 | [phase-12-webhook-triggers.md](phase-12-webhook-triggers.md) | Triggers | ⬜ |
| 13 | [phase-13-schedule-triggers.md](phase-13-schedule-triggers.md) | Triggers | ⬜ |
| 14 | [phase-14-browser-automation.md](phase-14-browser-automation.md) | Browser | ⬜ |
| 15 | [phase-15-ai-nodes.md](phase-15-ai-nodes.md) | AI | ⬜ |
| 16 | [phase-16-error-handling.md](phase-16-error-handling.md) | Quality | ⬜ |
| 17 | [phase-17-testing.md](phase-17-testing.md) | Quality | ⬜ |
| 18 | [phase-18-production.md](phase-18-production.md) | Deploy | ⬜ |
| 19 | [phase-19-workflow-versioning.md](phase-19-workflow-versioning.md) | Core | ⬜ |
| 20 | [phase-20-workspace-multitenancy.md](phase-20-workspace-multitenancy.md) ⚠️ | Multi-tenant | ⬜ |
| 21 | [phase-21-secrets-management.md](phase-21-secrets-management.md) | Security | ⬜ |
| 22 | [phase-22-ai-copilot.md](phase-22-ai-copilot.md) | AI | ⬜ |
| 23 | [phase-23-node-registry-api.md](phase-23-node-registry-api.md) | Core | ⬜ |
| 24 | [phase-24-user-management.md](phase-24-user-management.md) | Auth | ⬜ |
| 25 | [phase-25-templates-import-export.md](phase-25-templates-import-export.md) | UX | ⬜ |
| 26 | [phase-26-execution-advanced.md](phase-26-execution-advanced.md) | Core | ⬜ |
| 27 | [phase-27-realtime-collaboration.md](phase-27-realtime-collaboration.md) | Realtime | ⬜ |

⚠️ Phase 20 (Workspace) is a breaking schema change — adds `workspace_id` to all resources. Designed as a post-production migration. Read the phase before starting.

## Why This Order

Key non-obvious ordering decisions:

| Decision | Reason |
|---|---|
| Phase 5 (Variable Interpolation) before Phase 6 (Frontend) | Frontend needs `{{node.output.field}}` working before building the editor UI that uses it |
| Phase 5 before Phase 8 (Slack) | Slack acceptance criteria uses template syntax |
| Phase 20 (Workspace) after Phase 18 (Production) | Breaking migration — safer to ship product first, retrofit multi-tenancy after |
| Phase 19 (Versioning) before Phase 27 (Collab) | Collab uses version numbers for conflict detection |

## Empty Files Covered

| Empty file | Phase |
|---|---|
| `models/workflow_version.py` | 19 |
| `models/workspace.py` | 20 |
| `models/audit_log.py` | 24 |
| `models/secret.py` | 21 |
| `models/node_definition.py` | 23 |
| `models/integration.py` | 25 |
| `models/trigger.py` | 12 |
| `services/ai_service.py` | 22 |
| `services/credential_service.py` | 7 |
| `services/execution_service.py` | 3 |
| `services/integration_service.py` | 25 |
| `services/node_service.py` | 23 |
| `services/websocket_service.py` | 9 |
| `api/v1/nodes/` | 23 |
| `api/v1/secrets/` | 21 |
| `api/v1/variables/` | 23 |
| `api/v1/users/` | 24 |
| `api/v1/workspaces/` | 20 |
| `api/v1/logs/` | 23 |
| `packages/workflow-schema/src/edge.ts` | 5 |
| `packages/workflow-schema/src/node.ts` | 5 |
| `packages/workflow-schema/src/execution.ts` | 5 |
| `packages/workflow-schema/src/workflow.ts` | 5 |
| `packages/workflow-schema/src/validation.ts` | 5 |

## Rules

1. Work in phase number order — 0 through 27
2. Phase done = every checkbox checked + acceptance test passes
3. `make lint` must pass at end of every phase
4. Update status column as you complete phases
5. Use agent skills: `/add-node`, `/add-integration`, `/validate-node`, `/validate-trigger`
