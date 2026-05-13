# Phase 15 — AI Nodes

**Status: ⬜ Not Started**

---

## Goal

OpenAI Chat, Anthropic Claude, and structured output nodes work with real API keys.

## Prerequisites

- Phase 10 complete (more nodes pattern understood)
- OpenAI and/or Anthropic API keys available

---

## Step 1: Install AI Libraries

**File:** `apps/api/pyproject.toml` — add:

```toml
"openai>=1.30.0",
"anthropic>=0.28.0",
```

Run: `cd apps/api && uv sync`

---

## Node 1: OpenAI Chat

### Backend — `apps/api/app/node_system/builtins/openai_chat.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class OpenAIChatNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="ai.openai_chat",
            name="OpenAI: Chat",
            category="ai",
            description="Send a prompt to OpenAI GPT and get a response",
            properties=[
                {"name": "credential", "label": "OpenAI API Key", "type": "credential",
                 "credentialType": "openai_api_key", "required": True},
                {"name": "model", "label": "Model", "type": "options", "default": "gpt-4o-mini",
                 "options": [
                     {"label": "GPT-4o", "value": "gpt-4o"},
                     {"label": "GPT-4o Mini", "value": "gpt-4o-mini"},
                     {"label": "GPT-4 Turbo", "value": "gpt-4-turbo"},
                     {"label": "GPT-3.5 Turbo", "value": "gpt-3.5-turbo"},
                 ]},
                {"name": "system_prompt", "label": "System Prompt", "type": "string", "required": False,
                 "placeholder": "You are a helpful assistant."},
                {"name": "prompt", "label": "User Prompt", "type": "string", "required": True},
                {"name": "temperature", "label": "Temperature", "type": "number", "default": 0.7,
                 "mode": "advanced"},
                {"name": "max_tokens", "label": "Max Tokens", "type": "number", "default": 1000,
                 "mode": "advanced"},
            ],
            inputs=1,
            outputs=1,
            credential_type="openai_api_key",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            model = self.properties.get("model", "gpt-4o-mini")
            system_prompt = self.properties.get("system_prompt", "")
            prompt = self.properties.get("prompt")
            temperature = float(self.properties.get("temperature") or 0.7)
            max_tokens = int(self.properties.get("max_tokens") or 1000)

            if not prompt:
                return NodeResult(success=False, error="prompt is required")

            credential = context.credentials.get("openai_api_key")
            if not credential:
                return NodeResult(success=False, error="OpenAI credential not found")

            api_key = credential.get("api_key")
            if not api_key:
                return NodeResult(success=False, error="OpenAI API key missing in credential")

            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=api_key)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            content = response.choices[0].message.content
            usage = response.usage

            return NodeResult(
                success=True,
                output_data={
                    "content": content,
                    "model": response.model,
                    "tokens_used": usage.total_tokens if usage else None,
                    "prompt_tokens": usage.prompt_tokens if usage else None,
                    "completion_tokens": usage.completion_tokens if usage else None,
                },
            )

        except Exception as e:
            logger.error(f"OpenAIChatNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Node 2: Anthropic Claude Chat

### Backend — `apps/api/app/node_system/builtins/anthropic_chat.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class AnthropicChatNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="ai.anthropic_chat",
            name="Anthropic: Claude",
            category="ai",
            description="Send a prompt to Anthropic Claude and get a response",
            properties=[
                {"name": "credential", "label": "Anthropic API Key", "type": "credential",
                 "credentialType": "anthropic_api_key", "required": True},
                {"name": "model", "label": "Model", "type": "options", "default": "claude-sonnet-4-6",
                 "options": [
                     {"label": "Claude Sonnet 4.6", "value": "claude-sonnet-4-6"},
                     {"label": "Claude Haiku 4.5", "value": "claude-haiku-4-5-20251001"},
                     {"label": "Claude Opus 4.7", "value": "claude-opus-4-7"},
                 ]},
                {"name": "system_prompt", "label": "System Prompt", "type": "string", "required": False},
                {"name": "prompt", "label": "User Prompt", "type": "string", "required": True},
                {"name": "max_tokens", "label": "Max Tokens", "type": "number", "default": 1024,
                 "mode": "advanced"},
            ],
            inputs=1,
            outputs=1,
            credential_type="anthropic_api_key",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            model = self.properties.get("model", "claude-sonnet-4-6")
            system_prompt = self.properties.get("system_prompt", "")
            prompt = self.properties.get("prompt")
            max_tokens = int(self.properties.get("max_tokens") or 1024)

            if not prompt:
                return NodeResult(success=False, error="prompt is required")

            credential = context.credentials.get("anthropic_api_key")
            if not credential:
                return NodeResult(success=False, error="Anthropic credential not found")

            api_key = credential.get("api_key")

            import anthropic
            client = anthropic.AsyncAnthropic(api_key=api_key)

            kwargs: dict[str, Any] = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system_prompt:
                kwargs["system"] = system_prompt

            response = await client.messages.create(**kwargs)
            content = response.content[0].text

            return NodeResult(
                success=True,
                output_data={
                    "content": content,
                    "model": response.model,
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                    "stop_reason": response.stop_reason,
                },
            )

        except Exception as e:
            logger.error(f"AnthropicChatNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Node 3: Structured Output (JSON from LLM)

### Backend — `apps/api/app/node_system/builtins/ai_structured_output.py`

```python
import json
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class AiStructuredOutputNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="ai.structured_output",
            name="AI: Structured Output",
            category="ai",
            description="Extract structured JSON from text using AI",
            properties=[
                {"name": "credential", "label": "OpenAI API Key", "type": "credential",
                 "credentialType": "openai_api_key", "required": True},
                {"name": "input_text", "label": "Input Text", "type": "string", "required": True},
                {"name": "schema", "label": "Expected JSON Schema", "type": "json", "required": True,
                 "placeholder": '{"name": "string", "age": "number", "email": "string"}'},
                {"name": "model", "label": "Model", "type": "options", "default": "gpt-4o-mini",
                 "options": [
                     {"label": "GPT-4o", "value": "gpt-4o"},
                     {"label": "GPT-4o Mini", "value": "gpt-4o-mini"},
                 ]},
            ],
            inputs=1,
            outputs=1,
            credential_type="openai_api_key",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            input_text = self.properties.get("input_text")
            schema = self.properties.get("schema")
            model = self.properties.get("model", "gpt-4o-mini")

            if not input_text or not schema:
                return NodeResult(success=False, error="input_text and schema are required")

            credential = context.credentials.get("openai_api_key")
            if not credential:
                return NodeResult(success=False, error="OpenAI credential not found")

            if isinstance(schema, dict):
                schema_str = json.dumps(schema)
            else:
                schema_str = str(schema)

            system_prompt = f"""Extract structured data from the input text and return it as JSON.
The output must match this schema: {schema_str}
Return ONLY valid JSON, no explanation, no markdown."""

            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=credential.get("api_key"))

            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            return NodeResult(success=True, output_data={"result": result, "raw": content})

        except json.JSONDecodeError as e:
            return NodeResult(success=False, error=f"AI returned invalid JSON: {e}")
        except Exception as e:
            logger.error(f"AiStructuredOutputNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step: Register All AI Nodes

**File:** `apps/api/app/node_system/registry/registry.py` — add:

```python
from apps.api.app.node_system.builtins.openai_chat import OpenAIChatNode
from apps.api.app.node_system.builtins.anthropic_chat import AnthropicChatNode
from apps.api.app.node_system.builtins.ai_structured_output import AiStructuredOutputNode

node_registry.register(OpenAIChatNode)
node_registry.register(AnthropicChatNode)
node_registry.register(AiStructuredOutputNode)
```

Add `NodeDefinition` for each to `packages/node-definitions/src/ai.ts` and add to `NODE_REGISTRY`.

---

## Step: Store API Key Credentials

Users store AI credentials as:
```json
{"type": "openai_api_key", "data": {"api_key": "sk-..."}}
{"type": "anthropic_api_key", "data": {"api_key": "sk-ant-..."}}
```

---

## Checklist

- [ ] `openai` and `anthropic` added to `pyproject.toml` + `uv sync`
- [ ] `OpenAIChatNode` builds messages array with optional system prompt
- [ ] `OpenAIChatNode` returns `content`, `model`, `tokens_used`
- [ ] `OpenAIChatNode` passes `temperature` and `max_tokens` from properties
- [ ] `AnthropicChatNode` uses `client.messages.create()` (not deprecated `client.completions`)
- [ ] `AnthropicChatNode` returns `content`, `input_tokens`, `output_tokens`
- [ ] `AiStructuredOutputNode` uses `response_format={"type": "json_object"}`
- [ ] `AiStructuredOutputNode` sets `temperature=0` for deterministic extraction
- [ ] All nodes check for missing credential before calling API
- [ ] All nodes registered in backend and frontend
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
# Store OpenAI credential
curl -X POST localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"OpenAI","type":"openai_api_key","data":{"api_key":"sk-..."}}'

# Create workflow: OpenAI Chat
# node: ai.openai_chat, prompt="Say hello in 5 words"
# Run → {"content":"Hello there! How can I help?","tokens_used":25,...}

# Store Anthropic credential and test Claude
curl -X POST localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Anthropic","type":"anthropic_api_key","data":{"api_key":"sk-ant-..."}}'
# Create workflow: Anthropic Chat, run it → response from Claude
```

---

## Common Mistakes

- OpenAI SDK: use `AsyncOpenAI` not `OpenAI` — sync client blocks Celery worker event loop
- Anthropic SDK: `client.messages.create()` not `client.completions.create()` (deprecated)
- `response_format={"type":"json_object"}` only works with `gpt-4o` and `gpt-4o-mini` — not gpt-3.5
- Temperature must be float not int — cast with `float()`
- API key leaked in logs if you log the credential dict — never log credentials
