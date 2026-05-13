import asyncio
import uuid

from apps.api.app.core.celery import celery_app
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


@celery_app.task(name="execute_workflow", bind=True, max_retries=3)
def execute_workflow(self, execution_id: str, workflow_id: str, graph: dict, trigger_data: dict):
    """Main workflow execution task. Runs async WorkflowRunner in sync Celery context."""
    try:
        asyncio.run(_run_workflow(execution_id, workflow_id, graph, trigger_data))
    except Exception as e:
        logger.error(f"execute_workflow task failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=2**self.request.retries) from e


async def _run_workflow(execution_id: str, workflow_id: str, graph: dict, trigger_data: dict):
    from apps.api.app.core.database import AsyncSessionLocal
    from apps.api.app.execution_engine.engine.workflow_runner import WorkflowRunner
    from apps.api.app.repositories.execution_repository import ExecutionRepository

    # 1. Setup Phase: Mark running
    async with AsyncSessionLocal() as db:
        repo = ExecutionRepository(db)
        await repo.update_status(uuid.UUID(execution_id), "running")
        await repo.add_log(uuid.UUID(execution_id), "Workflow execution started", level="info")

    # 2. Execution Phase: Run the runner (No DB session held here)
    try:
        runner = WorkflowRunner(
            workflow_id=workflow_id,
            execution_id=execution_id,
            graph=graph,
        )
        output = await runner.run(trigger_data)

        # 3. Finish Phase: Mark completed
        async with AsyncSessionLocal() as db:
            repo = ExecutionRepository(db)
            await repo.update_status(uuid.UUID(execution_id), "completed", output_data=output)
            await repo.add_log(
                uuid.UUID(execution_id), "Workflow execution completed", level="info"
            )

    except Exception as e:
        logger.error(f"Workflow {workflow_id} failed: {e}", exc_info=True)
        async with AsyncSessionLocal() as db:
            repo = ExecutionRepository(db)
            await repo.update_status(uuid.UUID(execution_id), "failed")
            await repo.add_log(uuid.UUID(execution_id), f"Workflow failed: {str(e)}", level="error")
        raise
