# Adding an Integration

> Use the `/add-integration` agent skill for automated guidance. This is the manual reference.

## Steps

1. Create the integration client
2. Create the integration service
3. Create the OAuth provider (if OAuth)
4. Create node definitions (frontend)
5. Create node executors (backend)
6. Register everything

---

## Step 1: Integration Client

`apps/api/app/integrations/{service}/client.py`

```python
import httpx
from typing import Any, Dict, Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

BASE_URL = 'https://api.{service}.com/v1'


class {Service}Client:
    def __init__(self, access_token: str):
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
            },
            timeout=30.0,
        )

    async def get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        response = await self._client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    async def post(self, path: str, json: Optional[Dict] = None) -> Dict[str, Any]:
        response = await self._client.post(path, json=json)
        response.raise_for_status()
        return response.json()
```

## Step 2: Integration Service

`apps/api/app/integrations/{service}/service.py`

```python
from typing import Any, Dict, Optional
from apps.api.app.integrations.{service}.client import {Service}Client
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class {Service}Service:
    def __init__(self, access_token: str):
        self._client = {Service}Client(access_token=access_token)

    async def {action}(self, param: str, optional_param: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {'param': param}
        if optional_param:
            payload['optional_param'] = optional_param
        return await self._client.post('/{endpoint}', json=payload)
```

`apps/api/app/integrations/{service}/__init__.py`

```python
from apps.api.app.integrations.{service}.service import {Service}Service
from apps.api.app.integrations.{service}.client import {Service}Client

__all__ = ['{Service}Service', '{Service}Client']
```

## Step 3: OAuth Provider (if OAuth)

`apps/api/app/credential_manager/providers/{service}_provider.py`

```python
from apps.api.app.credential_manager.providers import BaseOAuthProvider

class {Service}OAuthProvider(BaseOAuthProvider):
    provider_id = '{service}'
    credential_type = '{service}_oauth'
    authorization_url = 'https://{service}.com/oauth/authorize'
    token_url = 'https://{service}.com/oauth/token'
    scopes = ['scope_1', 'scope_2']
```

## Step 4: Node Definitions

See [../nodes/creating-nodes.md](../nodes/creating-nodes.md) for the full NodeDefinition guide.

## Step 5: Node Executors

See [../nodes/creating-nodes.md](../nodes/creating-nodes.md) for the full BaseNode guide.

## Step 6: Register Everything

**Integration registry** (`apps/api/app/integrations/registry.py`):
```python
from apps.api.app.integrations.{service} import {Service}Service
INTEGRATION_REGISTRY['{service}'] = {Service}Service
```

**Node registry** (`apps/api/app/node_system/registry/registry.py`):
```python
from apps.api.app.node_system.builtins.{service}_{action} import {Service}{Action}Node
node_registry.register({Service}{Action}Node)
```

**Frontend node registry** (`packages/node-definitions/src/registry.ts`):
```typescript
import { {Service}{Action}Node } from './{service}'
export const NODE_REGISTRY: NodeDefinition[] = [
  // ...
  {Service}{Action}Node,
]
```

---

## Checklist

### Integration Layer
- [ ] `client.py` uses `httpx.AsyncClient` with auth header + timeout
- [ ] `client.py` calls `raise_for_status()` on every response
- [ ] `service.py` delegates all HTTP to client (no raw HTTP in service)
- [ ] `__init__.py` exports Service + Client
- [ ] Registered in `integrations/registry.py`

### OAuth Provider (if OAuth)
- [ ] `provider_id` + `credential_type` set
- [ ] `authorization_url` + `token_url` correct per API docs
- [ ] Scopes minimal — only what the integration needs

### Nodes
- [ ] `type` string identical in `NodeDefinition` and `get_metadata()`
- [ ] Frontend registered in `NODE_REGISTRY`
- [ ] Backend registered via `node_registry.register()`

### Final
- [ ] `make lint` passes
- [ ] `npx tsc --noEmit` passes
