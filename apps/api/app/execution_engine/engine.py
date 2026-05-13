import uuid
from typing import Any

from sqlalchemy import select

from apps.api.app.core.database import AsyncSessionLocal
from apps.api.app.core.logger import get_logger
from apps.api.app.models.workflow import Execution, Workflow

logger = get_logger(__name__)


class ExecutionEngine:
    async def trigger_workflow(
        self, workflow_id: uuid.UUID, trigger_type: str, input_data: dict[str, Any] | None = None
    ):
        async with AsyncSessionLocal() as db:
            # 1. Fetch workflow
            result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
            workflow = result.scalar_one_or_none()
            if not workflow:
                raise ValueError("Workflow not found")

            # 2. Create Execution record
            execution = Execution(
                workflow_id=workflow_id,
                trigger_type=trigger_type,
                status="pending",
                input_data=input_data,
            )
            db.add(execution)
            await db.commit()
            await db.refresh(execution)

            # 3. Analyze graph and find start nodes (nodes with no incoming edges or specific trigger nodes)
            # For simplicity, let's assume we find all nodes and start those that have no incoming edges
            # In a real engine, we'd use a DAG scheduler.

            # 4. Dispatch first set of tasks to worker queue
            logger.info(f"Dispatching execution {execution.id} for workflow {workflow.name}")

            return execution.id

    async def handle_node_completion(self, execution_id: uuid.UUID, node_id: str, output: Any):
        # This would be called by the worker when a node finishes
        # It should update the state and check for next nodes in the DAG
        pass


execution_engine = ExecutionEngine()
