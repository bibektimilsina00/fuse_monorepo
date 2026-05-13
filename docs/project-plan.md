# Fuse — Project Completion Plan

> **How to use this doc:** Work through phases in order. Each phase has a checklist.
> A phase is complete when every box is checked AND the acceptance criteria passes.
> Never skip a phase — each one is the foundation for the next.

---

## Current State (Baseline)

| Layer | Status |
|---|---|
| Project structure + monorepo | ✅ Done |
| Docker infra (PostgreSQL, Redis) | ✅ Done |
| FastAPI app + routers | ✅ Scaffold |
| SQLAlchemy models (Workflow, Execution, Credential) | ✅ Done |
| BaseNode + NodeRegistry | ✅ Done |
| Celery setup | ✅ Scaffold |
| Execution engine (WorkflowRunner) | ✅ Scaffold |
| Credential vault (AES encryption) | ✅ Working |
| ReactFlow canvas | ✅ Scaffold |
| Auth (hardcoded admin/admin) | ⚠️ Fake |
| User model | ❌ Missing |
| Real node implementations | ❌ Missing |
| Frontend routing + pages | ❌ Missing |
| OAuth flow | ❌ Missing |
| WebSocket execution streaming | ❌ Missing |
| Tests | ❌ Missing |

---

## Phase 0 — Environment Running

**Goal:** `make dev` starts without errors. API responds. DB is migrated.

### Checklist
- [x] Copy `.env.example` → `.env`, fill in `SECRET_KEY` and `ENCRYPTION_KEY` (`openssl rand -hex 32`)
- [x] `make setup` — installs all Python + Node deps without errors
- [x] `make db-up` — PostgreSQL + Redis containers running (`docker ps`)
- [x] `make migrate` — Alembic runs without errors
- [x] `uv run uvicorn apps.api.app.main:app --reload` — API starts on `:8000`
- [x] `curl http://localhost:8000/` returns `{"message": "Welcome to Fuse API"}`
- [x] `curl http://localhost:8000/api/v1/openapi.json` returns OpenAPI spec

**Acceptance:** API is live, DB is migrated, no import errors.

---

## Phase 1 — Real Authentication

**Goal:** Users can register, log in with JWT, and all protected endpoints enforce auth.

### What to build
| File | Action |
|---|---|
| `apps/api/app/models/user.py` | Add `User` model (id, email, hashed_password, created_at) |
| `apps/api/app/schemas/auth.py` | Pydantic schemas: `UserRegister`, `UserLogin`, `TokenResponse`, `UserOut` |
| `apps/api/app/repositories/user_repository.py` | `get_by_email()`, `create()` |
| `apps/api/app/services/auth_service.py` | `register()`, `authenticate()` |
| `apps/api/app/api/v1/auth/router.py` | `POST /register`, `POST /login`, `GET /me` |
| `apps/api/app/api/v1/auth/dependencies.py` | `get_current_user` FastAPI dependency |
| `alembic/versions/` | New migration for `user` table |

### Checklist
- [x] `User` model created with `id`, `email`, `hashed_password`, `is_active`, `created_at`
- [x] `UserRegister` schema validates email format + password min length 8
- [x] `POST /auth/register` creates user, returns `UserOut` (no password field)
- [x] `POST /auth/login` accepts `email` + `password` JSON, returns JWT token
- [x] `GET /auth/me` returns current user (requires valid JWT)
- [x] `get_current_user` dependency extracts + validates JWT, returns `User`
- [x] All future protected routers use `Depends(get_current_user)`
- [x] Alembic migration created + applied
- [x] Hardcoded `admin/admin` login removed from auth router
- [x] `make lint` passes (Python)

**Acceptance:**
```bash
# Register
curl -X POST localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → {"id":"...","email":"test@test.com"}

# Login
curl -X POST localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → {"access_token":"eyJ...","token_type":"bearer"}

# Protected route
curl localhost:8000/api/v1/auth/me -H "Authorization: Bearer eyJ..."
# → {"id":"...","email":"test@test.com"}
```

---

## Phase 2 — Workflow CRUD API

**Goal:** Full create/read/update/delete for workflows via the API.

### What to build
| File | Action |
|---|---|
| `apps/api/app/models/workflow.py` | Add `user_id` FK to `Workflow` model |
| `apps/api/app/schemas/workflow.py` | `WorkflowCreate`, `WorkflowUpdate`, `WorkflowOut` |
| `apps/api/app/repositories/workflow_repository.py` | `list_by_user()`, `create()`, `update()`, `delete()` |
| `apps/api/app/services/workflow_service.py` | Full service layer |
| `apps/api/app/api/v1/workflows/router.py` | Full CRUD endpoints + auth dependency |
| `alembic/versions/` | Migration for `user_id` column on `workflow` |

### Checklist
- [ ] `Workflow.user_id` FK column added + migration applied
- [ ] `WorkflowCreate`: `name` (required), `description` (optional), `graph` (optional, defaults to empty)
- [ ] `WorkflowOut`: includes `id`, `name`, `description`, `graph`, `is_active`, `created_at`
- [ ] `GET /workflows/` returns only workflows owned by current user
- [ ] `POST /workflows/` creates workflow owned by current user
- [ ] `GET /workflows/{id}` returns workflow (403 if not owner)
- [ ] `PUT /workflows/{id}` updates name, description, graph (403 if not owner)
- [ ] `DELETE /workflows/{id}` deletes workflow (403 if not owner)
- [ ] `POST /workflows/{id}/run` triggers manual execution (returns `execution_id`)
- [ ] All routes require `get_current_user`
- [ ] `make lint` passes

**Acceptance:**
```bash
TOKEN="eyJ..."  # from Phase 1
curl -X POST localhost:8000/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Workflow"}'
# → {"id":"...","name":"My First Workflow","graph":{"nodes":[],"edges":[]},...}
```

---

## Phase 3 — Execution Pipeline (End-to-End)

**Goal:** Trigger a workflow manually, have it execute via Celery, track status in DB.

### What to build
| File | Action |
|---|---|
| `apps/worker/app/jobs/tasks.py` | Rewrite: use `WorkflowRunner` + `NodeRegistry`, remove `print()` |
| `apps/api/app/execution_engine/engine.py` | Enqueue real Celery task on trigger |
| `apps/api/app/api/v1/executions/router.py` | `GET /executions/`, `GET /executions/{id}` with logs |
| `apps/api/app/schemas/execution.py` | `ExecutionOut`, `ExecutionLogOut` |
| `apps/api/app/repositories/execution_repository.py` | `list_by_workflow()`, `get_with_logs()`, `update_status()` |

### Checklist
- [ ] `tasks.py` removed `print()` — uses `get_logger`
- [ ] `tasks.py` uses `WorkflowRunner` from `execution_engine`
- [ ] `WorkflowRunner` updates `Execution.status` → `running` on start, `completed`/`failed` on finish
- [ ] `ExecutionEngine.trigger_workflow()` enqueues real Celery task (not mock)
- [ ] `POST /workflows/{id}/run` returns `{"execution_id": "uuid"}`
- [ ] `GET /executions/{id}` returns status + logs
- [ ] Worker processes the task without crashing (even with empty graph)
- [ ] `make db-up && celery -A apps.worker.app.worker worker --loglevel=info` starts without errors
- [ ] Execution with empty graph: status = `completed`, no errors
- [ ] `make lint` passes

**Acceptance:**
```bash
# Trigger execution
curl -X POST localhost:8000/api/v1/workflows/{id}/run \
  -H "Authorization: Bearer $TOKEN"
# → {"execution_id":"..."}

# Check status
curl localhost:8000/api/v1/executions/{execution_id} \
  -H "Authorization: Bearer $TOKEN"
# → {"status":"completed","logs":[]}
```

---

## Phase 4 — First Real Nodes

**Goal:** HTTP Request and Delay nodes fully implemented and executing correctly.

### What to build
| File | Action |
|---|---|
| `apps/api/app/node_system/builtins/http_request.py` | Full implementation |
| `apps/api/app/node_system/builtins/delay.py` | Full implementation |
| `apps/api/app/node_system/builtins/condition.py` | Full implementation |
| `apps/api/app/node_system/registry/registry.py` | Register all 3 nodes |
| `packages/node-definitions/src/http.ts` | `NodeDefinition` for HTTP Request |
| `packages/node-definitions/src/registry.ts` | Register HTTP Request, Delay, Condition |

### HTTP Request Node Spec
- Properties: `url` (string, required), `method` (options: GET/POST/PUT/DELETE, default GET), `headers` (json, optional), `body` (json, optional)
- Output: `status_code` (number), `body` (json), `headers` (json)
- Uses `httpx.AsyncClient`

### Delay Node Spec
- Properties: `milliseconds` (number, required, default 1000)
- Output: `delayed_for` (number)
- Uses `asyncio.sleep(ms / 1000)`

### Condition Node Spec
- Properties: `left` (string), `operator` (options: `==`, `!=`, `>`, `<`, `contains`), `right` (string)
- Output: `result` (boolean), `branch` (`"true"` or `"false"`)
- Execution engine follows the `true` or `false` edge based on `branch`

### Checklist
- [ ] HTTP Request node executes real HTTP calls
- [ ] HTTP Request node returns `status_code`, `body`, `headers`
- [ ] HTTP Request node handles errors (non-2xx, network failure) gracefully
- [ ] Delay node waits the correct amount of time
- [ ] Condition node evaluates all 5 operators correctly
- [ ] All 3 nodes registered in backend `node_registry`
- [ ] All 3 nodes registered in frontend `NODE_REGISTRY`
- [ ] Workflow with `[Delay(1000ms) → HTTP Request(GET https://httpbin.org/get)]` executes end-to-end
- [ ] `make lint` passes

**Acceptance:**
Build this workflow in the canvas and run it:
```
[Manual Trigger] → [Delay: 500ms] → [HTTP Request: GET httpbin.org/get]
```
Execution completes, logs show HTTP 200 response body.

---

## Phase 5 — Frontend: Pages & Routing

**Goal:** Full frontend UI — login page, dashboard, workflow editor with sidebar.

### What to build
| File | Action |
|---|---|
| `apps/web/src/app/router.tsx` | React Router: `/login`, `/dashboard`, `/workflows/:id` |
| `apps/web/src/app/providers.tsx` | `QueryClientProvider`, `AuthProvider` |
| `apps/web/src/stores/auth.store.ts` | Auth state (token, user, logout) |
| `apps/web/src/services/api.ts` | Axios instance with auth interceptor |
| `apps/web/src/features/auth/LoginPage.tsx` | Email + password form |
| `apps/web/src/features/dashboard/DashboardPage.tsx` | List workflows, create button |
| `apps/web/src/features/dashboard/WorkflowCard.tsx` | Card: name, status, run button |
| `apps/web/src/features/workflow-editor/NodePanel.tsx` | Left sidebar: draggable node list |
| `apps/web/src/features/workflow-editor/PropertyPanel.tsx` | Right sidebar: selected node properties form |
| `apps/web/src/features/workflow-editor/ExecutionPanel.tsx` | Bottom panel: execution logs |
| `apps/web/src/hooks/workflows/` | React Query hooks: `useWorkflows`, `useWorkflow`, `useCreateWorkflow` |
| `apps/web/src/hooks/executions/` | React Query hooks: `useExecution`, `useTriggerWorkflow` |

### Checklist
- [ ] Login page: email + password form, calls `POST /auth/login`, stores token in localStorage
- [ ] Unauthenticated users redirected to `/login`
- [ ] Dashboard page: lists all user's workflows using React Query
- [ ] Dashboard: "New Workflow" button creates workflow + navigates to editor
- [ ] Workflow editor: left panel shows draggable node list from `NODE_REGISTRY`
- [ ] Workflow editor: nodes can be dragged onto canvas
- [ ] Workflow editor: clicking a node opens property form in right panel
- [ ] Property form: shows correct inputs for each node type
- [ ] Property form: changes saved to Zustand store
- [ ] "Save Workflow" button sends updated graph to `PUT /workflows/{id}`
- [ ] "Run" button triggers execution, shows execution ID
- [ ] Execution log panel shows status (polling or WebSocket)
- [ ] API calls use auth token from store
- [ ] 401 response logs user out + redirects to `/login`
- [ ] All React Query hooks use key factories + `staleTime`
- [ ] `npx tsc --noEmit` passes
- [ ] `make lint` passes

**Acceptance:**
Full flow works in browser:
1. Open `/login` → log in
2. See dashboard with workflow list
3. Click "New Workflow" → editor opens
4. Drag HTTP Request onto canvas, fill URL
5. Click Save → no errors
6. Click Run → execution completes → logs visible

---

## Phase 6 — Credential Management

**Goal:** Users can store OAuth tokens and API keys. Credentials are injected into node execution.

### What to build
| File | Action |
|---|---|
| `apps/api/app/models/credential.py` | Add `user_id` FK |
| `apps/api/app/schemas/credential.py` | `CredentialCreate`, `CredentialOut` |
| `apps/api/app/api/v1/credentials/router.py` | Full CRUD + OAuth URL + callback |
| `apps/api/app/credential_manager/oauth/flow.py` | OAuth PKCE flow |
| `apps/api/app/credential_manager/oauth/callback.py` | Token exchange on callback |
| `apps/api/app/credential_manager/encryption/aes.py` | Fix `encryption_service` name inconsistency |
| `apps/api/app/execution_engine/engine/workflow_runner.py` | Inject credentials into `NodeContext` |
| `apps/web/src/features/credentials/CredentialsPage.tsx` | List + add credentials UI |
| `apps/web/src/features/credentials/AddCredentialModal.tsx` | OAuth + API key flow |
| `alembic/versions/` | Migration: `user_id` on `credential` |

### Checklist
- [ ] `Credential.user_id` FK added + migration applied
- [ ] `GET /credentials/` returns only current user's credentials
- [ ] `POST /credentials/` stores API key credential (encrypted)
- [ ] `DELETE /credentials/{id}` removes credential
- [ ] `GET /credentials/oauth/{service}/url` returns OAuth authorization URL
- [ ] OAuth callback stores access + refresh tokens (encrypted)
- [ ] `WorkflowRunner` fetches credentials for current user + injects into `NodeContext.credentials`
- [ ] `encryption_service` name fixed (was referencing wrong module)
- [ ] Credentials page: lists stored credentials (type, name, created_at — no raw token)
- [ ] "Connect" button for OAuth services opens provider auth page
- [ ] After OAuth, credential appears in list
- [ ] `make lint` passes

**Acceptance:**
1. Click "Connect Slack" → redirected to Slack auth → token stored
2. Trigger a Slack node → `context.credentials['slack_oauth']` is populated

---

## Phase 7 — First Integration: Slack

**Goal:** Slack "Send Message" node works end-to-end with real credentials.

### What to build
| File | Action |
|---|---|
| `apps/api/app/integrations/slack/client.py` | Full httpx client |
| `apps/api/app/integrations/slack/service.py` | `send_message()`, `list_channels()` |
| `apps/api/app/integrations/slack/oauth.py` | Slack OAuth provider |
| `apps/api/app/node_system/builtins/slack_send_message.py` | Full executor |
| `packages/node-definitions/src/slack.ts` | Full `NodeDefinition` |
| `packages/node-definitions/src/registry.ts` | Register Slack node |

### Slack Send Message Node Spec
- Properties: `credential` (credential picker), `channel` (string), `text` (string), `thread_ts` (string, advanced)
- Output: `ts` (string — message timestamp), `channel` (string)
- Calls `POST https://slack.com/api/chat.postMessage`

### Checklist
- [ ] Slack OAuth provider: correct auth URL, token URL, scopes (`chat:write`, `channels:read`)
- [ ] `SlackClient` makes authenticated requests to Slack API
- [ ] `SlackService.send_message()` works with real Slack token
- [ ] `SlackSendMessageNode.execute()` fetches credential from context, calls service
- [ ] Node returns `ts` and `channel` on success
- [ ] Node returns `NodeResult(success=False, error=...)` on API error (not crash)
- [ ] Frontend node shows credential picker + channel + text fields
- [ ] Credential picker populates from user's stored credentials
- [ ] Full workflow: `[Manual Trigger] → [Slack: Send Message]` sends real Slack message
- [ ] `make lint` passes

**Acceptance:**
Build and run workflow → real Slack message received in your workspace.

---

## Phase 8 — WebSocket Execution Streaming

**Goal:** Execution logs stream in real-time to the browser while the workflow runs.

### What to build
| File | Action |
|---|---|
| `apps/api/app/api/v1/websocket/router.py` | Full WebSocket endpoint |
| `apps/api/app/core/websocket.py` | WebSocket manager (connection tracking) |
| `apps/api/app/execution_engine/engine/workflow_runner.py` | Emit events via `event_bus` |
| `apps/api/app/core/events.py` | Subscribe WebSocket manager to execution events |
| `apps/web/src/websocket/client.ts` | WebSocket client hook |
| `apps/web/src/features/workflow-editor/ExecutionPanel.tsx` | Render streamed logs |

### Checklist
- [ ] WebSocket endpoint at `ws://localhost:8000/api/v1/ws/executions/{id}`
- [ ] WebSocket authenticates via token query param
- [ ] `WorkflowRunner` emits `NODE_STARTED`, `NODE_COMPLETED`, `NODE_FAILED` events
- [ ] Events forwarded to all WebSocket clients subscribed to that execution ID
- [ ] Frontend connects to WebSocket when execution starts
- [ ] Execution panel shows live node status (running/completed/failed)
- [ ] Execution panel shows log messages per node
- [ ] WebSocket disconnects cleanly when execution finishes
- [ ] `make lint` passes

**Acceptance:**
Run a workflow → execution panel shows nodes lighting up in real-time.

---

## Phase 9 — More Nodes

**Goal:** Core workflow nodes fully implemented.

### Nodes to build (in order)

| Node | Type | Key properties | Key output |
|---|---|---|---|
| Set Variable | `logic.set_variable` | `key`, `value` | `key`, `value` |
| Get Variable | `logic.get_variable` | `key` | `value` |
| JSON Transform | `logic.json_transform` | `input`, `template` (jinja2) | `result` |
| AI (OpenAI) | `ai.openai_chat` | `credential`, `model`, `prompt`, `system` | `content`, `tokens_used` |
| Wait for Webhook | `trigger.wait_webhook` | `path` | `body`, `headers` |
| Loop | `logic.loop` | `items` (json array), `batch_size` | `item`, `index` |

### Checklist for each node
- [ ] `NodeDefinition` in `packages/node-definitions/src/`
- [ ] `BaseNode` executor in `apps/api/app/node_system/builtins/`
- [ ] Executor handles all error cases gracefully
- [ ] Registered in both frontend and backend registries
- [ ] Manual test: node executes correctly in a workflow

**Milestone:** Build a workflow: `[Trigger] → [HTTP Request] → [JSON Transform] → [OpenAI Chat] → [Slack Message]`

---

## Phase 10 — More Integrations

**Goal:** GitHub and one more integration fully working.

### Integrations to build (in order)
1. **GitHub** — create issue, list issues, add comment
2. **Notion** — create page, append block
3. **Gmail** — send email, read emails

### For each integration
- [ ] OAuth provider registered
- [ ] `client.py` + `service.py` implemented
- [ ] Node definitions (frontend) + executors (backend)
- [ ] Registered in all registries
- [ ] End-to-end test: workflow using this integration runs successfully

---

## Phase 11 — Webhook Triggers

**Goal:** Workflows can be started automatically by external webhook events.

### What to build
| File | Action |
|---|---|
| `apps/api/app/models/trigger.py` | Full `Trigger` model (workflow_id, type, config, secret) |
| `apps/api/app/api/v1/triggers/router.py` | CRUD for triggers |
| `apps/api/app/api/v1/triggers/webhook_handler.py` | Generic webhook receiver |
| `alembic/versions/` | Migration for `trigger` table |
| `apps/web/src/features/triggers/` | Trigger config UI in workflow editor |

### Checklist
- [ ] `Trigger` model: `id`, `workflow_id`, `type` (`webhook`/`cron`), `config` (JSON), `secret` (encrypted), `created_at`
- [ ] `POST /triggers/` creates trigger for a workflow
- [ ] `GET /triggers/{workflow_id}` lists triggers for a workflow
- [ ] `POST /webhooks/{trigger_id}` receives external webhook
- [ ] Webhook handler verifies HMAC signature against stored secret
- [ ] Verified webhook enqueues workflow execution with webhook payload as trigger data
- [ ] Frontend: trigger configuration panel in workflow editor
- [ ] Frontend: shows webhook URL for copy-paste
- [ ] `make lint` passes

**Acceptance:**
```bash
curl -X POST localhost:8000/api/v1/webhooks/{trigger_id} \
  -H "X-Signature: sha256=..." \
  -d '{"event":"push","repo":"myrepo"}'
# → Workflow execution starts
```

---

## Phase 12 — Schedule (Cron) Triggers

**Goal:** Workflows run automatically on a schedule.

### What to build
| File | Action |
|---|---|
| `apps/api/app/execution_engine/scheduler/cron.py` | Celery beat schedule |
| `apps/api/app/api/v1/triggers/router.py` | `POST /triggers/cron` endpoint |
| `apps/web/src/features/triggers/` | Cron expression builder UI |

### Checklist
- [ ] Trigger with `type: "cron"` stores cron expression in config
- [ ] Celery beat runs cron checker every minute
- [ ] Due cron triggers enqueue workflow executions
- [ ] Timezone-aware scheduling
- [ ] Frontend: cron expression input with human-readable preview
- [ ] `make lint` passes

---

## Phase 13 — Browser Automation

**Goal:** Playwright nodes work in the Celery worker.

### What to build
| File | Action |
|---|---|
| `apps/worker/app/browser/playwright_manager.py` | Full Playwright manager |
| `apps/worker/app/browser/browser_pool.py` | Browser pool (reuse instances) |
| `apps/api/app/node_system/builtins/browser_open_page.py` | Full executor |
| `apps/api/app/node_system/builtins/browser_get_text.py` | New: extract text from selector |
| `apps/api/app/node_system/builtins/browser_click.py` | New: click element |
| `apps/api/app/node_system/builtins/browser_screenshot.py` | New: take screenshot |

### Checklist
- [ ] Playwright installed in worker Docker image
- [ ] `BrowserPool` manages browser instances (open/reuse/close)
- [ ] `browser.open_page` node navigates to URL, returns page title + URL
- [ ] `browser.get_text` node extracts text from CSS selector
- [ ] `browser.click` node clicks element by CSS selector
- [ ] `browser.screenshot` node returns base64 screenshot
- [ ] Browser nodes clean up sessions after execution
- [ ] `make lint` passes

---

## Phase 14 — AI Nodes

**Goal:** LLM nodes (OpenAI, Anthropic) fully working with streaming support.

### Nodes to build
| Node | Type | Description |
|---|---|---|
| OpenAI Chat | `ai.openai_chat` | Chat completion with system prompt |
| OpenAI Embed | `ai.openai_embed` | Text → embedding vector |
| Anthropic Claude | `ai.anthropic_chat` | Claude chat completion |
| Text Classifier | `ai.classify` | Classify text into categories using LLM |
| Structured Output | `ai.structured_output` | LLM → typed JSON via function calling |

### Checklist
- [ ] OpenAI client integrated (API key credential)
- [ ] `ai.openai_chat` sends prompt, returns `content` + `tokens_used`
- [ ] Anthropic client integrated
- [ ] `ai.anthropic_chat` sends prompt, returns `content`
- [ ] All AI nodes handle API errors gracefully
- [ ] `make lint` passes

---

## Phase 15 — Error Handling & Resilience

**Goal:** System handles failures gracefully. No crashes, no silent failures.

### Checklist
- [ ] `WorkflowRunner` catches node failures, marks execution `failed` with reason
- [ ] Celery task retries on transient failures (3 retries, exponential backoff)
- [ ] API returns proper error responses (400, 401, 403, 404, 422, 500)
- [ ] All `except Exception` blocks log `exc_info=True`
- [ ] OAuth token refresh works (expired token auto-refreshed before use)
- [ ] Node timeout: nodes that run > 30s are killed + marked failed
- [ ] Global exception handler in FastAPI returns consistent error format
- [ ] `make lint` passes

---

## Phase 16 — Testing

**Goal:** Critical paths have automated tests.

### What to build
| Test | File |
|---|---|
| Auth: register + login | `apps/api/tests/test_auth.py` |
| Workflow CRUD | `apps/api/tests/test_workflows.py` |
| Execution pipeline | `apps/api/tests/test_execution.py` |
| HTTP Request node | `apps/api/tests/test_nodes.py` |
| Slack node (mock) | `apps/api/tests/test_integrations.py` |
| Credential vault | `apps/api/tests/test_credentials.py` |

### Checklist
- [ ] `pytest` configured with `httpx.AsyncClient` test client
- [ ] Test DB uses separate PostgreSQL database or in-memory SQLite
- [ ] Auth tests: register, login, token validation, expired token
- [ ] Workflow tests: CRUD, ownership enforcement (403 on other user's workflow)
- [ ] Execution tests: trigger → status polling → completed
- [ ] Node tests: HTTP Request, Delay, Condition execute correctly
- [ ] Integration tests: Slack mocked via `respx` / `pytest-mock`
- [ ] All tests pass: `uv run pytest`
- [ ] Frontend: `pnpm test` passes (Vitest)

---

## Phase 17 — Production Readiness

**Goal:** Ready to deploy. Secure, observable, containerized.

### Checklist

**Security**
- [ ] `allow_origins=["*"]` in CORS replaced with specific frontend domain
- [ ] `SECRET_KEY` and `ENCRYPTION_KEY` loaded from secrets manager (not `.env` in prod)
- [ ] Rate limiting on auth endpoints (`slowapi` or similar)
- [ ] SQL injection impossible (SQLAlchemy ORM used everywhere — no raw SQL)
- [ ] HTTPS enforced (nginx reverse proxy config)
- [ ] Webhook secrets are long random strings (min 32 bytes)

**Observability**
- [ ] Structured JSON logging in production (`python-json-logger`)
- [ ] Request ID attached to all log lines
- [ ] Execution metrics tracked (duration, success rate)
- [ ] Health check endpoint: `GET /health` returns DB + Redis status

**Docker**
- [ ] `apps/api/Dockerfile` builds and runs without errors
- [ ] `apps/worker/Dockerfile` builds and runs without errors
- [ ] `docker-compose.yml` runs full stack (`api`, `worker`, `web`, `db`, `redis`)
- [ ] Environment variables documented for production deployment
- [ ] `docker-compose up -d` — all services healthy

**Frontend**
- [ ] `pnpm build` succeeds with no type errors
- [ ] Bundle size reasonable (no unnecessary large deps)
- [ ] `VITE_API_BASE_URL` configurable for production

---

## Summary: Build Order

```
Phase 0  → Environment Running              (1 day)
Phase 1  → Real Authentication              (1–2 days)
Phase 2  → Workflow CRUD API                (1–2 days)
Phase 3  → Execution Pipeline               (2–3 days)
Phase 4  → First Real Nodes                 (2 days)
Phase 5  → Frontend Pages & Routing         (3–4 days)
Phase 6  → Credential Management            (2–3 days)
Phase 7  → First Integration (Slack)        (1–2 days)
Phase 8  → WebSocket Streaming              (1–2 days)
Phase 9  → More Nodes                       (2–3 days)
Phase 10 → More Integrations                (2–3 days per integration)
Phase 11 → Webhook Triggers                 (2 days)
Phase 12 → Schedule Triggers                (1–2 days)
Phase 13 → Browser Automation              (2–3 days)
Phase 14 → AI Nodes                         (2 days)
Phase 15 → Error Handling & Resilience      (2 days)
Phase 16 → Testing                          (3–4 days)
Phase 17 → Production Readiness             (2–3 days)
```

**Total estimate: 6–9 weeks** solo, building full-time.

---

## Rules for Using This Plan

1. **Never skip a phase.** Each phase is a dependency for the next.
2. **A phase is only done when its acceptance criteria passes**, not just when the checklist is checked.
3. **Use the agent skills** — `/add-node`, `/add-integration`, `/validate-node` — they know the conventions.
4. **`make lint` must pass at the end of every phase** before moving forward.
5. **When stuck**, re-read the relevant doc in `docs/` before asking for help.
