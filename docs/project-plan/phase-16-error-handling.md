# Phase 16 — Error Handling & Resilience

**Status: ⬜ Not Started**

---

## Goal

System handles failures gracefully. No unhandled crashes. Consistent error responses. Retries on transient failures. Node timeouts enforced.

## Prerequisites

- Phase 15 complete (all nodes built)

---

## Step 1: Global FastAPI Exception Handler

**File:** `apps/api/app/main.py` — add:

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
```

---

## Step 2: HTTP Exceptions Pattern

**File:** `apps/api/app/core/exceptions.py`

```python
from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, resource: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} not found")


class ForbiddenError(HTTPException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=message)


class ConflictError(HTTPException):
    def __init__(self, message: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=message)


class BadRequestError(HTTPException):
    def __init__(self, message: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
```

Use these throughout services instead of raw `HTTPException`.

---

## Step 3: Node Timeout Enforcement

**File:** `apps/api/app/execution_engine/engine/node_executor.py`

Wrap node execution with asyncio timeout:

```python
import asyncio

class NodeExecutor:
    NODE_TIMEOUT_SECONDS = 30  # max time per node

    async def execute_node(self, node_type, node_id, properties, input_data, context) -> NodeResult:
        try:
            node_class = node_registry.get_node(node_type)
            node_instance = node_class(node_id=node_id, properties=properties)
            logger.info(f"Executing node {node_id} of type {node_type}")

            try:
                result = await asyncio.wait_for(
                    node_instance.execute(input_data, context),
                    timeout=self.NODE_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                logger.error(f"Node {node_id} timed out after {self.NODE_TIMEOUT_SECONDS}s")
                return NodeResult(
                    success=False,
                    error=f"Node timed out after {self.NODE_TIMEOUT_SECONDS} seconds",
                )

            return result
        except ValueError as e:
            # Node type not registered
            logger.error(f"Unknown node type: {node_type}")
            return NodeResult(success=False, error=f"Unknown node type: {node_type}")
        except Exception as e:
            logger.error(f"Error executing node {node_id}: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step 4: Celery Task Retry Configuration

**File:** `apps/worker/app/jobs/tasks.py`

Update task decorator with retry config:

```python
@celery_app.task(
    name="execute_workflow",
    bind=True,
    max_retries=3,
    default_retry_delay=5,     # seconds before first retry
    autoretry_for=(Exception,),
    retry_backoff=True,         # exponential backoff
    retry_backoff_max=60,
    retry_jitter=True,
)
def execute_workflow(self, execution_id, workflow_id, graph, trigger_data):
    try:
        asyncio.run(_run_workflow(execution_id, workflow_id, graph, trigger_data))
    except Exception as e:
        logger.error(f"execute_workflow failed (attempt {self.request.retries + 1}): {e}", exc_info=True)
        raise  # triggers autoretry
```

---

## Step 5: OAuth Token Refresh

**File:** `apps/api/app/credential_manager/oauth/refresh.py`

```python
import json
from datetime import datetime, timezone
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


async def refresh_slack_token(refresh_token: str, settings) -> dict:
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": settings.SLACK_CLIENT_ID,
                "client_secret": settings.SLACK_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
    data = response.json()
    if not data.get("ok"):
        raise ValueError(f"Token refresh failed: {data.get('error')}")
    return data


async def maybe_refresh_credential(credential_data: dict, credential_type: str) -> dict:
    """Check if token is expired and refresh if needed. Returns updated credential data."""
    expires_at_str = credential_data.get("expires_at")
    if not expires_at_str:
        return credential_data  # No expiry info — assume valid

    expires_at = datetime.fromisoformat(expires_at_str)
    if datetime.now(timezone.utc) < expires_at:
        return credential_data  # Still valid

    logger.info(f"Refreshing expired {credential_type} token")
    refresh_token = credential_data.get("refresh_token")
    if not refresh_token:
        logger.warning(f"No refresh token for {credential_type} — cannot refresh")
        return credential_data

    from apps.api.app.core.config import settings
    if credential_type == "slack_oauth":
        new_data = await refresh_slack_token(refresh_token, settings)
        credential_data["access_token"] = new_data.get("access_token", credential_data["access_token"])

    return credential_data
```

---

## Step 6: Request ID Middleware

Add request ID to all log lines for tracing:

**File:** `apps/api/app/middleware/logging.py`

```python
import uuid
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.time()

        response = await call_next(request)

        duration_ms = int((time.time() - start) * 1000)
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"→ {response.status_code} ({duration_ms}ms)"
        )
        response.headers["X-Request-ID"] = request_id
        return response
```

---

## Step 7: Health Check Endpoint

**File:** `apps/api/app/main.py` — add:

```python
@app.get("/health")
async def health_check():
    from apps.api.app.core.database import engine
    from apps.api.app.core.redis import get_redis
    import asyncio

    checks = {}

    # DB check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    # Redis check
    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    all_ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={"status": "ok" if all_ok else "degraded", "checks": checks},
    )
```

---

## Checklist

- [ ] Global `RequestValidationError` handler returns `{"detail":"Validation error","errors":[...]}`
- [ ] Global `Exception` handler returns `{"detail":"Internal server error"}` (no stack trace to client)
- [ ] Global exception handler logs `exc_info=True` server-side
- [ ] `NotFoundError`, `ForbiddenError`, `ConflictError`, `BadRequestError` defined in `exceptions.py`
- [ ] Services use typed exception classes not raw `HTTPException(status_code=404)`
- [ ] Node executor wraps `execute()` in `asyncio.wait_for(timeout=30)`
- [ ] `asyncio.TimeoutError` returns `NodeResult(success=False, error="timed out")`
- [ ] `ValueError` for unregistered node type returns clean error (not 500)
- [ ] Celery task has `max_retries=3`, exponential backoff, jitter
- [ ] `LoggingMiddleware` logs method, path, status, duration, request ID
- [ ] `GET /health` checks DB and Redis, returns 200 or 503
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
# Health check
curl localhost:8000/health
# → {"status":"ok","checks":{"database":"ok","redis":"ok"}}

# DB down
docker stop fuse_new-db-1
curl localhost:8000/health
# → 503 {"status":"degraded","checks":{"database":"error: ...","redis":"ok"}}
docker start fuse_new-db-1

# Invalid request body
curl -X POST localhost:8000/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": 123}'  # wrong type
# → 422 {"detail":"Validation error","errors":[...]}

# Node with bad type in workflow
# → execution fails with {"status":"failed"}, error="Unknown node type: bad.type"
# → not a 500, not a crash
```

---

## Common Mistakes

- Logging `exc_info=True` leaks stack traces — fine for server logs, never send to client
- `asyncio.wait_for` in sync context — must be inside `async` function
- Retry with `autoretry_for=(Exception,)` retries ALL exceptions including programming errors — consider retrying only `(httpx.HTTPError, ConnectionError)` for integration nodes
- Health check `/health` should NOT require authentication — monitoring tools need it unauthenticated
