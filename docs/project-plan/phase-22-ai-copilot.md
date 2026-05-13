# Phase 22 — AI Copilot (Workflow Generator)

**Status: ⬜ Not Started**

---

## Goal

Users describe what they want in plain English. AI generates a complete workflow graph. `ai_service.py` implemented. `/ai/generate` endpoint implemented.

## Prerequisites

- Phase 15 complete (AI nodes, OpenAI SDK available)
- Phase 4 complete (nodes registered, NODE_REGISTRY populated)
- User has an OpenAI credential stored

---

## How It Works

```
User types: "When I receive a webhook, fetch data from my API and send a Slack message"

AI receives:
  - User prompt
  - Available node types (from NODE_REGISTRY)
  - Node property schemas

AI returns:
  - WorkflowGraph JSON (nodes + edges + properties filled in)

Frontend:
  - Loads graph into ReactFlow canvas
  - User can edit/refine before saving
```

---

## Step 1: AI Service

**File:** `apps/api/app/services/ai_service.py`

```python
import json
from typing import Any
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


SYSTEM_PROMPT = """You are an expert workflow automation architect.
Given a user's description and a list of available nodes, generate a workflow graph as JSON.

Rules:
1. Use ONLY node types from the provided registry. Never invent node types.
2. Return ONLY valid JSON matching the WorkflowGraph schema.
3. Every node needs a unique id (use n1, n2, n3...).
4. Every node needs position (x, y) — space them 250px apart horizontally.
5. Fill in reasonable default properties where you can infer them.
6. Leave properties empty string "" if you cannot determine the value.
7. Start workflows with a trigger node when the user describes an event.
8. Connect nodes with edges in the correct execution order.

WorkflowGraph schema:
{
  "nodes": [
    {
      "id": "n1",
      "type": "<node_type_from_registry>",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "<human readable name>",
        "properties": {
          "<property_name>": "<value>"
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "n1", "target": "n2"}
  ]
}
"""


class AIService:
    def __init__(self, api_key: str):
        self._api_key = api_key

    async def generate_workflow(
        self,
        prompt: str,
        available_nodes: list[dict],
        model: str = "gpt-4o",
    ) -> dict[str, Any]:
        """Generate a workflow graph from a natural language description."""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self._api_key)

        # Build node registry context for the AI
        node_registry_str = json.dumps(
            [
                {
                    "type": n["type"],
                    "name": n["name"],
                    "description": n["description"],
                    "category": n["category"],
                    "properties": [
                        {"name": p["name"], "label": p["label"], "type": p["type"], "required": p.get("required", False)}
                        for p in n.get("properties", [])
                    ],
                }
                for n in available_nodes
            ],
            indent=2,
        )

        user_message = f"""Available nodes:
{node_registry_str}

User request: {prompt}

Generate a WorkflowGraph JSON for this request."""

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        content = response.choices[0].message.content
        logger.info(f"AI generated workflow for prompt: {prompt[:100]}...")

        try:
            graph = json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"AI returned invalid JSON: {e}")

        # Validate structure
        if "nodes" not in graph or "edges" not in graph:
            raise ValueError("AI response missing 'nodes' or 'edges' fields")

        return graph

    async def explain_workflow(self, graph: dict, model: str = "gpt-4o-mini") -> str:
        """Generate a plain-English explanation of what a workflow does."""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self._api_key)
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Explain this workflow in 2-3 plain English sentences. Be concise."},
                {"role": "user", "content": json.dumps(graph)},
            ],
            temperature=0.3,
            max_tokens=200,
        )
        return response.choices[0].message.content

    async def suggest_next_node(self, graph: dict, selected_node_id: str, model: str = "gpt-4o-mini") -> list[str]:
        """Suggest what node to add next after a selected node."""
        from openai import AsyncOpenAI
        from apps.api.app.node_system.registry.registry import node_registry

        all_types = [cls.get_metadata().type for cls in node_registry._nodes.values()]

        client = AsyncOpenAI(api_key=self._api_key)
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Return a JSON array of 3 node type strings that would logically follow the selected node."},
                {"role": "user", "content": f"Graph: {json.dumps(graph)}\nSelected node: {selected_node_id}\nAvailable types: {all_types}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        result = json.loads(response.choices[0].message.content)
        return result.get("suggestions", [])
```

---

## Step 2: AI Router

**File:** `apps/api/app/api/v1/ai/router.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class GenerateWorkflowRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gpt-4o"
    credential_id: Optional[str] = None  # optional: specific OpenAI credential to use


class GenerateWorkflowResponse(BaseModel):
    graph: dict
    explanation: str
    node_count: int
    edge_count: int


@router.post("/generate-workflow", response_model=GenerateWorkflowResponse)
async def generate_workflow(
    request: GenerateWorkflowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get OpenAI credential
    from apps.api.app.repositories.credential_repository import CredentialRepository
    from apps.api.app.credential_manager.encryption.aes import encryption_service
    import json

    cred_repo = CredentialRepository(db)
    cred = await cred_repo.get_by_type_and_user("openai_api_key", current_user.id)
    if not cred:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key required. Add one in Credentials settings."
        )

    cred_data = json.loads(encryption_service.decrypt(cred.encrypted_data))
    api_key = cred_data.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key is empty")

    # Get available nodes
    from apps.api.app.node_system.registry.registry import node_registry
    available_nodes = node_registry.list_nodes()

    from apps.api.app.services.ai_service import AIService
    ai_service = AIService(api_key=api_key)

    try:
        graph = await ai_service.generate_workflow(
            prompt=request.prompt,
            available_nodes=available_nodes,
            model=request.model,
        )
        explanation = await ai_service.explain_workflow(graph)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Workflow generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate workflow")

    return GenerateWorkflowResponse(
        graph=graph,
        explanation=explanation,
        node_count=len(graph.get("nodes", [])),
        edge_count=len(graph.get("edges", [])),
    )


@router.post("/explain-workflow")
async def explain_workflow(
    graph: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Same credential loading as above
    from apps.api.app.repositories.credential_repository import CredentialRepository
    from apps.api.app.credential_manager.encryption.aes import encryption_service
    import json

    cred_repo = CredentialRepository(db)
    cred = await cred_repo.get_by_type_and_user("openai_api_key", current_user.id)
    if not cred:
        raise HTTPException(status_code=400, detail="OpenAI API key required")

    cred_data = json.loads(encryption_service.decrypt(cred.encrypted_data))
    from apps.api.app.services.ai_service import AIService
    ai_service = AIService(api_key=cred_data.get("api_key"))
    explanation = await ai_service.explain_workflow(graph)
    return {"explanation": explanation}
```

---

## Step 3: Frontend Copilot UI

**File:** `apps/web/src/features/workflow-editor/CopilotPanel.tsx`

```typescript
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { workflowKeys } from '@/hooks/workflows/keys'

interface Props {
  workflowId: string
  onGraphGenerated: (graph: { nodes: any[]; edges: any[] }) => void
}

export function CopilotPanel({ workflowId, onGraphGenerated }: Props) {
  const [prompt, setPrompt] = useState('')
  const [explanation, setExplanation] = useState('')

  const generate = useMutation({
    mutationFn: async (prompt: string) => {
      const { data } = await api.post('/ai/generate-workflow', { prompt, model: 'gpt-4o' })
      return data
    },
    onSuccess: (data) => {
      setExplanation(data.explanation)
      onGraphGenerated(data.graph)
    },
  })

  return (
    <div className="p-4 border-b border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-700">✨ AI Copilot</span>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your workflow... e.g. 'When a GitHub issue is created, send a Slack message with the issue title'"
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={() => generate.mutate(prompt)}
        disabled={!prompt.trim() || generate.isPending}
        className="mt-2 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {generate.isPending ? 'Generating...' : 'Generate Workflow'}
      </button>

      {explanation && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">{explanation}</p>
        </div>
      )}

      {generate.isError && (
        <p className="mt-2 text-xs text-red-500">
          Failed to generate. Make sure you have an OpenAI API key configured.
        </p>
      )}
    </div>
  )
}
```

Wire into `Editor.tsx` — add `CopilotPanel` to the left sidebar above the node list.

When `onGraphGenerated` fires, load the new graph into the ReactFlow canvas (update Zustand store).

---

## Checklist

- [ ] `AIService.generate_workflow()` builds correct prompt with node registry context
- [ ] `AIService.generate_workflow()` uses `response_format={"type":"json_object"}`
- [ ] `AIService.generate_workflow()` validates response has `nodes` and `edges`
- [ ] `AIService.explain_workflow()` returns 2-3 sentence explanation
- [ ] `AIService.suggest_next_node()` returns 3 node type suggestions
- [ ] `POST /ai/generate-workflow` loads user's OpenAI credential
- [ ] `POST /ai/generate-workflow` returns 400 if no OpenAI credential
- [ ] `POST /ai/generate-workflow` returns `graph`, `explanation`, `node_count`, `edge_count`
- [ ] `CopilotPanel` textarea prompts user for description
- [ ] Generate button disabled when prompt is empty or loading
- [ ] Generated graph loaded into ReactFlow canvas on success
- [ ] Explanation shown below generate button
- [ ] Error shown if generation fails (no credential, quota exceeded, etc.)
- [ ] `make lint` passes

---

## Acceptance Criteria

1. Open workflow editor
2. Type in copilot: `"Fetch data from httpbin.org/json and log the slideshow title"`
3. Click "Generate Workflow"
4. Canvas populates with:
   - HTTP Request node (url: httpbin.org/json)
   - Possibly a JSON Transform or Log node
   - Edges connecting them
5. Explanation appears: `"This workflow fetches JSON data from httpbin.org and extracts the slideshow title."`
6. Click "Run" — workflow executes successfully

---

## Common Mistakes

- Passing full graph JSON to AI on every request — expensive and slow. Pass only node metadata.
- AI generates invalid `type` strings not in registry — validate against `node_registry._nodes.keys()` and reject/warn
- `response_format={"type":"json_object"}` requires the word "json" in the prompt — always mention "JSON" in system prompt
- Generated node IDs not unique — AI sometimes uses `node_1` as both id and type. Validate and fix
- User sees partial/broken graph on error — always validate before loading into canvas
