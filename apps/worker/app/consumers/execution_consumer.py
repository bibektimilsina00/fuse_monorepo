import asyncio
import os

from celery import Celery

from apps.worker.app.worker_runtime import worker_runtime

# Initialize Celery app
celery_app = Celery(
    "fuse_worker", broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
)


@celery_app.task(name="tasks.execute_workflow")
def execute_workflow_task(execution_id: str):
    """
    EntryPoint for workflow execution from the queue.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(worker_runtime.process_execution(execution_id))
