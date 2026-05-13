import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.models.workflow import Workflow
from apps.api.app.repositories.workflow_repository import WorkflowRepository
from apps.api.app.schemas.workflow import WorkflowCreate


class WorkflowService:
    def __init__(self, db: AsyncSession):
        self.repository = WorkflowRepository(db)

    async def get_workflow(self, workflow_id: uuid.UUID):
        return await self.repository.get_by_id(workflow_id)

    async def create_new_workflow(self, data: WorkflowCreate):
        workflow = Workflow(name=data.name, description=data.description, graph=data.graph)
        return await self.repository.create(workflow)
