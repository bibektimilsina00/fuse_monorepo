# Execution Engine

The execution engine is responsible for running workflows. It spans both the API and the Worker.

## Flow

```
POST /workflows/{id}/run
  │
  ▼
ExecutionEngine.trigger_workflow()   [apps/api/app/execution_engine/engine.py]
  ├── Create Execution record in DB (status: pending)
  └── Enqueue workflow_job → Redis (Celery)
                │
                ▼
        Worker picks up task          [apps/worker/app/jobs/tasks.py]
                │
                ▼
        WorkflowRunner.run()          [apps/api/app/execution_engine/engine/workflow_runner.py]
          ├── _get_start_nodes()      # nodes with no incoming edges
          └── _execute_node_recursive()
                ├── Build NodeContext (execution_id, credentials, variables)
                ├── NodeExecutor.execute_node()
                │     ├── node_registry.get_node(type)
                │     ├── NodeClass(node_id, properties)
                │     └── node.execute(input_data, context) → NodeResult
                └── Follow outgoing edges with output_data as next input_data
```

## DAG Execution

Workflows are directed acyclic graphs (DAGs). The engine:

1. Finds **start nodes** — nodes with no incoming edges
2. Executes them with `trigger_data` as input
3. On success, passes `output_data` to all downstream nodes
4. On failure, stops that branch and logs the error

Nodes are currently executed **sequentially** per branch. Parallel branch execution (nodes with no dependency between them) is planned.

## NodeContext

Every node execution receives a `NodeContext`:

```python
class NodeContext(BaseModel):
    execution_id: str        # current execution UUID
    workflow_id: str         # parent workflow UUID
    node_id: str             # this node's ID
    variables: Dict[str, Any]   # workflow-level variables (set/get nodes)
    credentials: Dict[str, Any] # decrypted credentials, keyed by type
                                # e.g. credentials['slack_oauth']['access_token']
```

Credentials are injected by the execution engine before calling `execute()`. Node executors never touch the DB for credentials.

## NodeResult

```python
class NodeResult(BaseModel):
    success: bool
    output_data: Dict[str, Any]  # becomes input_data for next nodes
    error: Optional[str]         # set on failure
    logs: List[str]              # node-level log messages
```

## Event Bus

`apps/api/app/core/events.py` — in-process pub/sub for execution events.

```python
class EventType(str, Enum):
    EXECUTION_STARTED = "execution_started"
    EXECUTION_COMPLETED = "execution_completed"
    NODE_STARTED = "node_started"
    NODE_COMPLETED = "node_completed"
    LOG_EMITTED = "log_emitted"
```

The WebSocket handler subscribes to these events to stream real-time updates to the browser.

## Files

| File | Role |
|---|---|
| `execution_engine/engine.py` | `ExecutionEngine` — top-level: create Execution record, enqueue Celery task |
| `execution_engine/engine/workflow_runner.py` | `WorkflowRunner` — traverse DAG, recurse nodes |
| `execution_engine/engine/node_executor.py` | `NodeExecutor` — instantiate and call BaseNode |
| `core/events.py` | `EventBus` — in-process pub/sub |
| `node_system/registry/registry.py` | `NodeRegistry` — maps type strings to BaseNode classes |

## Planned Features

- Parallel branch execution
- Conditional branching (logic nodes)
- Loop / iteration nodes
- Error handling nodes (try/catch in workflow)
- Execution timeout per node
- Retry policies
