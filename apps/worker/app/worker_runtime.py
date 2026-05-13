import logging

from sqlalchemy import select

from apps.api.app.core.database import AsyncSessionLocal
from apps.api.app.execution_engine.engine.workflow_runner import WorkflowRunner
from apps.api.app.models.workflow import Execution, Workflow

logger = logging.getLogger("fuse.worker.runtime")


class WorkerRuntime:
    async def process_execution(self, execution_id: str):
        async with AsyncSessionLocal() as db:
            # 1. Fetch execution and workflow
            stmt = select(Execution).where(Execution.id == execution_id)
            result = await db.execute(stmt)
            execution = result.scalar_one_or_none()

            if not execution:
                logger.error(f"Execution {execution_id} not found")
                return

            stmt = select(Workflow).where(Workflow.id == execution.workflow_id)
            result = await db.execute(stmt)
            workflow = result.scalar_one_or_none()

            if not workflow:
                logger.error(f"Workflow {execution.workflow_id} not found")
                return

            # 2. Update status to running
            execution.status = "running"
            await db.commit()

            # 3. Initialize and run workflow runner
            runner = WorkflowRunner(
                workflow_id=str(workflow.id), execution_id=execution_id, graph=workflow.graph
            )

            try:
                await runner.run(trigger_data=execution.input_data or {})
                execution.status = "completed"
            except Exception as e:
                logger.error(f"Execution {execution_id} failed: {str(e)}")
                execution.status = "failed"
            finally:
                await db.commit()


worker_runtime = WorkerRuntime()
