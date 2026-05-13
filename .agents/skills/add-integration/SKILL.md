---
name: add-integration
description: Add a complete Fuse integration from API docs — covering integration client, service, OAuth provider, node definitions, node executors, credential provider, and all registrations. Use when introducing a new external service under apps/api/app/integrations/{service}/ and packages/node-definitions/.
---

# Add Integration Skill

You are an expert at adding complete integrations to Fuse. This skill orchestrates the full process of adding a new service integration.

## Overview

Adding an integration involves these steps in order:
1. **Research** — Read the service's API documentation
2. **Create Integration Client** — HTTP client wrapper for the service API
3. **Create Integration Service** — Business logic using the client
4. **Add OAuth Provider** (if OAuth) — Credential manager provider
5. **Create Node Definitions** — Frontend TypeScript NodeDefinitions
6. **Create Node Executors** — Backend Python BaseNode subclasses
7. **Register Everything** — Registry entries in all required files

## Step 1: Research the API

Before writing any code:
1. Use WebFetch to read official API docs
2. Identify:
   - Authentication method (OAuth 2.0, API Key, Bearer token)
   - Available operations (CRUD, messaging, etc.)
   - Required vs optional parameters
   - Response structures
   - Webhook support (for triggers)

### Hard Rule: No Guessed Response Schemas

If official docs do not clearly show the response JSON shape, you MUST stop and tell the user exactly which outputs are unknown.

- Do NOT guess response field names
- Do NOT invent output properties just because they seem likely
- If response schemas are missing: ask the user for sample responses or test credentials

## Step 2: Create Integration Client

### File Location
`apps/api/app/integrations/{service}/client.py`

```python
import httpx
from typing import Any, Dict, Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

BASE_URL = 'https://api.{service}.com/v1'


class {Service}Client:
    """HTTP client for {Service} API."""

    def __init__(self, access_token: str):
        self._access_token = access_token
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

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
```

## Step 3: Create Integration Service

### File Location
`apps/api/app/integrations/{service}/service.py`

```python
from typing import Any, Dict, Optional
from apps.api.app.integrations.{service}.client import {Service}Client
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class {Service}Service:
    """Business logic for {Service} integration."""

    def __init__(self, access_token: str):
        self._client = {Service}Client(access_token=access_token)

    async def {action}(self, param: str, optional_param: Optional[str] = None) -> Dict[str, Any]:
        """Perform {action} on {Service}."""
        payload: Dict[str, Any] = {'param': param}
        if optional_param:
            payload['optional_param'] = optional_param
        return await self._client.post('/{endpoint}', json=payload)

    async def close(self):
        await self._client.close()
```

### Barrel export

`apps/api/app/integrations/{service}/__init__.py`:
```python
from apps.api.app.integrations.{service}.service import {Service}Service
from apps.api.app.integrations.{service}.client import {Service}Client

__all__ = ['{Service}Service', '{Service}Client']
```

## Step 4: Add OAuth Provider (if OAuth)

### File Location
`apps/api/app/credential_manager/providers/{service}_provider.py`

```python
from typing import Any, Dict
from apps.api.app.credential_manager.providers import BaseOAuthProvider

SCOPES = [
    'scope_1',
    'scope_2',
]

class {Service}OAuthProvider(BaseOAuthProvider):
    provider_id = '{service}'
    credential_type = '{service}_oauth'

    authorization_url = 'https://{service}.com/oauth/authorize'
    token_url = 'https://{service}.com/oauth/token'
    scopes = SCOPES

    def get_auth_params(self, redirect_uri: str, state: str) -> Dict[str, Any]:
        return {
            'client_id': self.client_id,
            'redirect_uri': redirect_uri,
            'scope': ' '.join(self.scopes),
            'state': state,
            'response_type': 'code',
        }

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        # Exchange authorization code for tokens
        ...

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        # Refresh expired access token
        ...
```

Register in `apps/api/app/credential_manager/providers/__init__.py`.

## Step 5: Create Node Definitions (Frontend)

### File Location
`packages/node-definitions/src/{service}.ts`

```typescript
import type { NodeDefinition } from './registry'

export const {Service}{Action}Node: NodeDefinition = {
  type: 'action.{service}_{action}',
  name: '{Service} {Action}',
  category: 'integration',
  description: 'Brief description',
  icon: '{service}',
  credentialType: '{service}_oauth',

  properties: [
    {
      name: 'credential',
      label: '{Service} Account',
      type: 'credential',
      credentialType: '{service}_oauth',
      required: true,
    },
    // ... operation-specific properties
  ],

  inputs: 1,
  outputs: 1,
}
```

See the `/add-node` skill for full NodeDefinition reference.

### Register in node registry

`packages/node-definitions/src/registry.ts`:
```typescript
import { {Service}{Action}Node } from './{service}'

export const NODE_REGISTRY: NodeDefinition[] = [
  // ... existing nodes ...
  {Service}{Action}Node,
]
```

## Step 6: Create Node Executors (Backend)

### File Location
`apps/api/app/node_system/builtins/{service}_{action}.py`

```python
from typing import Any, Dict
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class {Service}{Action}Node(BaseNode):
    """Brief docstring."""

    @property
    def type(self) -> str:
        return 'action.{service}_{action}'

    async def execute(self, input_data: Dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            param = self.properties.get('paramName')
            credential = context.credentials.get('{service}_oauth')
            if not credential:
                return NodeResult(success=False, error='{Service} credential not found')

            from apps.api.app.integrations.{service}.service import {Service}Service
            service = {Service}Service(access_token=credential.get('access_token'))
            result = await service.{action}(param=param)

            return NodeResult(
                success=True,
                output_data={
                    'id': result.get('id'),
                    'field': result.get('field'),
                },
            )
        except Exception as e:
            logger.error(f'{Service}{Action}Node failed: {e}', exc_info=True)
            return NodeResult(success=False, error=str(e))
```

### Register the executor

`apps/api/app/node_system/registry/registry.py`:
```python
from apps.api.app.node_system.builtins.{service}_{action} import {Service}{Action}Node

NODE_REGISTRY = {
    # ... existing nodes ...
    'action.{service}_{action}': {Service}{Action}Node,
}
```

## Step 7: Register Integration

`apps/api/app/integrations/registry.py`:
```python
from apps.api.app.integrations.{service} import {Service}Service

INTEGRATION_REGISTRY = {
    # ... existing integrations ...
    '{service}': {Service}Service,
}
```

## Complete Checklist

### Integration Layer
- [ ] Created `apps/api/app/integrations/{service}/client.py`
- [ ] Created `apps/api/app/integrations/{service}/service.py`
- [ ] Created `apps/api/app/integrations/{service}/__init__.py`
- [ ] Client uses `httpx.AsyncClient` with proper auth headers
- [ ] Service delegates HTTP calls to client (no raw HTTP in service)
- [ ] All nullable API response fields use `.get()` with defaults
- [ ] Registered in `apps/api/app/integrations/registry.py`

### OAuth (if OAuth service)
- [ ] Created `apps/api/app/credential_manager/providers/{service}_provider.py`
- [ ] `provider_id` and `credential_type` set correctly
- [ ] Scopes defined — only what the integration needs
- [ ] `authorization_url`, `token_url` correct per API docs
- [ ] `exchange_code` and `refresh_token` implemented
- [ ] Registered in credential manager providers

### Node Definitions (Frontend)
- [ ] Created `packages/node-definitions/src/{service}.ts`
- [ ] `type` uses format `'{category}.{service}_{action}'`
- [ ] `credentialType` matches `provider_id + '_oauth'`
- [ ] All required properties marked `required: true`
- [ ] Optional rarely-used properties use `mode: 'advanced'`
- [ ] Credential property uses `type: 'credential'`
- [ ] Registered in `packages/node-definitions/src/registry.ts`

### Node Executors (Backend)
- [ ] Created `apps/api/app/node_system/builtins/{service}_{action}.py`
- [ ] `type` property returns same string as frontend `NodeDefinition.type`
- [ ] Never raises uncaught exceptions — returns `NodeResult(success=False, error=...)`
- [ ] Uses `context.credentials.get(credential_type)` for auth
- [ ] Uses absolute imports only
- [ ] Uses `logger` from `apps.api.app.core.logger`
- [ ] Registered in `apps/api/app/node_system/registry/registry.py`

### Final Validation (Required)
- [ ] `make lint` passes (`ruff` for Python + `eslint` for TypeScript)
- [ ] `npx tsc --noEmit` passes (frontend type check)
- [ ] Node `type` strings match exactly between frontend and backend
- [ ] All API response fields used in outputs are backed by docs or live-verified
- [ ] If any response schema was unknown, told the user instead of guessing

## Common Gotchas

1. **Type string must match exactly** — `NodeDefinition.type` (TS) must equal executor `type` property (Python)
2. **Absolute imports only** — never `from .client import ...` — always `from apps.api.app.integrations.{service}.client import ...`
3. **Never `print()`** — use `logger.error()`, `logger.info()`, `logger.warning()`
4. **Never `console.log()`** — use a unified frontend logger utility
5. **Credential type naming** — `{service}_oauth` for OAuth, `{service}_api_key` for API key
6. **All snake_case** for Python filenames, class names in PascalCase
7. **Tailwind only** for all frontend styling — no inline styles
