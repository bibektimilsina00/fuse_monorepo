# Phase 17 — Testing

**Status: ⬜ Not Started**

---

## Goal

Critical paths have automated tests. Auth, workflow CRUD, execution, nodes, and integrations all covered.

## Prerequisites

- Phase 16 complete (error handling solid)

---

## Step 1: Install Test Dependencies

**File:** `apps/api/pyproject.toml` — add:

```toml
[project.optional-dependencies]
test = [
    "pytest>=8.2.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
    "pytest-mock>=3.14.0",
    "respx>=0.21.0",    # mock httpx requests
    "factory-boy>=3.3.0",
    "faker>=25.0.0",
]
```

Run: `cd apps/api && uv sync --extra test`

---

## Step 2: Pytest Configuration

**File:** `apps/api/pyproject.toml` — add:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
```

**File:** `apps/api/tests/__init__.py` — create empty file

**File:** `apps/api/tests/conftest.py`

```python
import asyncio
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from apps.api.app.main import app
from apps.api.app.core.database import get_db
from apps.api.app.models.base import Base
from apps.api.app.core.security import get_password_hash

TEST_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost/fuse_test"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DB_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture
async def db_session(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session):
    from apps.api.app.models.user import User
    user = User(
        id=uuid.uuid4(),
        email=f"test-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=get_password_hash("password123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def auth_headers(client, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "password123",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

---

## Step 3: Auth Tests

**File:** `apps/api/tests/test_auth.py`

```python
import pytest


async def test_register(client):
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@test.com",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert "hashed_password" not in data
    assert "id" in data


async def test_register_duplicate_email(client, test_user):
    response = await client.post("/api/v1/auth/register", json={
        "email": test_user.email,
        "password": "password123",
    })
    assert response.status_code == 409


async def test_login_success(client, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "wrongpassword",
    })
    assert response.status_code == 401


async def test_me_authenticated(client, auth_headers):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert "email" in response.json()


async def test_me_unauthenticated(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_me_invalid_token(client):
    response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401
```

---

## Step 4: Workflow Tests

**File:** `apps/api/tests/test_workflows.py`

```python
import pytest
import uuid


async def test_create_workflow(client, auth_headers):
    response = await client.post("/api/v1/workflows/", headers=auth_headers, json={
        "name": "Test Workflow",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Workflow"
    assert data["graph"] == {"nodes": [], "edges": []}


async def test_list_workflows_only_own(client, auth_headers, db_session, test_user):
    # Create workflow for test_user
    await client.post("/api/v1/workflows/", headers=auth_headers, json={"name": "Mine"})

    # List — should only see own workflow
    response = await client.get("/api/v1/workflows/", headers=auth_headers)
    assert response.status_code == 200
    workflows = response.json()
    assert all(w["user_id"] == str(test_user.id) for w in workflows)


async def test_get_other_users_workflow_returns_404(client, auth_headers, db_session):
    # Create another user and their workflow
    from apps.api.app.models.user import User
    from apps.api.app.models.workflow import Workflow
    from apps.api.app.core.security import get_password_hash

    other_user = User(
        email="other@test.com",
        hashed_password=get_password_hash("pass"),
        is_active=True,
    )
    db_session.add(other_user)
    await db_session.commit()

    other_workflow = Workflow(
        user_id=other_user.id,
        name="Other's Workflow",
        graph={"nodes": [], "edges": []},
    )
    db_session.add(other_workflow)
    await db_session.commit()

    # Try to get it with test_user's token
    response = await client.get(f"/api/v1/workflows/{other_workflow.id}", headers=auth_headers)
    assert response.status_code == 404


async def test_update_workflow(client, auth_headers):
    create_resp = await client.post("/api/v1/workflows/", headers=auth_headers, json={"name": "Old Name"})
    wf_id = create_resp.json()["id"]

    update_resp = await client.put(f"/api/v1/workflows/{wf_id}", headers=auth_headers, json={
        "name": "New Name",
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "New Name"


async def test_delete_workflow(client, auth_headers):
    create_resp = await client.post("/api/v1/workflows/", headers=auth_headers, json={"name": "Delete Me"})
    wf_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/workflows/{wf_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/workflows/{wf_id}", headers=auth_headers)
    assert get_resp.status_code == 404
```

---

## Step 5: Node Unit Tests

**File:** `apps/api/tests/test_nodes.py`

```python
import pytest
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.node_system.builtins.delay import DelayNode
from apps.api.app.node_system.builtins.condition import ConditionNode


def make_context():
    return NodeContext(
        execution_id="test-exec-id",
        workflow_id="test-wf-id",
        node_id="test-node-id",
        variables={},
        credentials={},
    )


async def test_delay_node():
    node = DelayNode("n1", {"milliseconds": 10})  # 10ms for fast tests
    result = await node.execute({}, make_context())
    assert result.success is True
    assert result.output_data["delayed_for_ms"] == 10


async def test_delay_node_negative_ms():
    node = DelayNode("n1", {"milliseconds": -1})
    result = await node.execute({}, make_context())
    assert result.success is False
    assert "0" in result.error


async def test_condition_node_equal():
    node = ConditionNode("n1", {"left": "hello", "operator": "==", "right": "hello"})
    result = await node.execute({}, make_context())
    assert result.success is True
    assert result.output_data["result"] is True
    assert result.output_data["branch"] == "true"


async def test_condition_node_not_equal():
    node = ConditionNode("n1", {"left": "hello", "operator": "!=", "right": "world"})
    result = await node.execute({}, make_context())
    assert result.success is True
    assert result.output_data["result"] is True


async def test_condition_node_contains():
    node = ConditionNode("n1", {"left": "Hello World", "operator": "contains", "right": "world"})
    result = await node.execute({}, make_context())
    assert result.success is True
    assert result.output_data["result"] is True


async def test_http_request_node(respx_mock):
    import respx
    import httpx

    respx_mock.get("https://httpbin.org/get").mock(
        return_value=httpx.Response(200, json={"url": "https://httpbin.org/get"})
    )

    from apps.api.app.node_system.builtins.http_request import HttpRequestNode
    node = HttpRequestNode("n1", {"url": "https://httpbin.org/get", "method": "GET"})
    result = await node.execute({}, make_context())

    assert result.success is True
    assert result.output_data["status_code"] == 200
    assert result.output_data["ok"] is True
```

---

## Step 6: Integration Tests (Mocked)

**File:** `apps/api/tests/test_integrations.py`

```python
import pytest
import httpx
import respx
from apps.api.app.node_system.base.execution_contract import NodeContext


def make_context_with_slack():
    return NodeContext(
        execution_id="exec-1",
        workflow_id="wf-1",
        node_id="n1",
        variables={},
        credentials={"slack_oauth": {"access_token": "xoxb-test-token"}},
    )


@respx.mock
async def test_slack_send_message_success():
    respx.post("https://slack.com/api/chat.postMessage").mock(
        return_value=httpx.Response(200, json={"ok": True, "ts": "123456.789", "channel": "C123"})
    )

    from apps.api.app.node_system.builtins.slack_send_message import SlackSendMessageNode
    node = SlackSendMessageNode("n1", {"channel": "C123", "text": "Hello!"})
    result = await node.execute({}, make_context_with_slack())

    assert result.success is True
    assert result.output_data["ts"] == "123456.789"
    assert result.output_data["channel"] == "C123"


@respx.mock
async def test_slack_send_message_api_error():
    respx.post("https://slack.com/api/chat.postMessage").mock(
        return_value=httpx.Response(200, json={"ok": False, "error": "channel_not_found"})
    )

    from apps.api.app.node_system.builtins.slack_send_message import SlackSendMessageNode
    node = SlackSendMessageNode("n1", {"channel": "INVALID", "text": "Hello!"})
    result = await node.execute({}, make_context_with_slack())

    assert result.success is False
    assert "channel_not_found" in result.error


async def test_slack_send_message_no_credential():
    from apps.api.app.node_system.base.execution_contract import NodeContext
    from apps.api.app.node_system.builtins.slack_send_message import SlackSendMessageNode

    ctx = NodeContext(execution_id="e", workflow_id="w", node_id="n", variables={}, credentials={})
    node = SlackSendMessageNode("n1", {"channel": "C123", "text": "Hello!"})
    result = await node.execute({}, ctx)

    assert result.success is False
    assert "credential" in result.error.lower()
```

---

## Step 7: Run Tests

Add to `Makefile`:
```makefile
test:
	cd apps/api && PYTHONPATH=../.. uv run pytest tests/ -v

test-watch:
	cd apps/api && PYTHONPATH=../.. uv run pytest tests/ -v --tb=short -x
```

Create test database:
```bash
docker exec -it fuse_new-db-1 psql -U postgres -c "CREATE DATABASE fuse_test;"
```

Run:
```bash
make test
```

---

## Checklist

- [ ] `pytest`, `pytest-asyncio`, `httpx`, `respx`, `pytest-mock` installed
- [ ] `asyncio_mode = "auto"` in pytest config
- [ ] `tests/conftest.py` with `engine`, `db_session`, `client`, `test_user`, `auth_headers` fixtures
- [ ] Test DB uses separate `fuse_test` database (not `fuse`)
- [ ] `db_session` fixture rolls back after each test — tests isolated
- [ ] `app.dependency_overrides` used to inject test DB session
- [ ] Auth tests: register, login, me, wrong password, invalid token
- [ ] Workflow tests: create, list (own only), get (404 for other's), update, delete
- [ ] Node unit tests: delay, condition (all operators), http_request (mocked)
- [ ] Integration tests: Slack success, Slack API error, missing credential
- [ ] `fuse_test` database created in Docker
- [ ] `make test` passes all tests
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
make test
# → All tests pass
# → No warnings about unclosed DB connections

# Test count should be:
# - Auth: ~7 tests
# - Workflows: ~5 tests
# - Nodes: ~6 tests
# - Integrations: ~3 tests
# Total: ~21+ tests, all green
```

---

## Common Mistakes

- `asyncio_mode = "auto"` missing — async tests error with `coroutine was never awaited`
- Not rolling back `db_session` — tests contaminate each other
- `app.dependency_overrides.clear()` missing in fixture teardown — leaks between test files
- Using `fuse` database for tests — tests delete real data
- `respx.mock` vs `@respx.mock` — use the decorator form on async test functions
