import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.models.workflow import Workflow
from apps.api.app.repositories.workflow_repository import WorkflowRepository
from apps.api.app.schemas.workflow import WorkflowCreate, WorkflowUpdate

class WorkflowService:
    def __init__(self, db: AsyncSession):
        self.repository = WorkflowRepository(db)

    async def create_workflow(self, user_id: uuid.UUID, workflow_in: WorkflowCreate) -> Workflow:
        workflow = Workflow(
            user_id=user_id,
            name=workflow_in.name,
            description=workflow_in.description,
            graph=workflow_in.graph
        )
        return await self.repository.create(workflow)

    async def get_workflow(self, workflow_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Workflow]:
        workflow = await self.repository.get_by_id(workflow_id)
        if workflow and workflow.user_id == user_id:
            return workflow
        return None

    async def list_workflows(self, user_id: uuid.UUID) -> List[Workflow]:
        return await self.repository.list_by_user(user_id)

    async def update_workflow(
        self, workflow_id: uuid.UUID, user_id: uuid.UUID, workflow_in: WorkflowUpdate
    ) -> Optional[Workflow]:
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            return None
        
        update_data = workflow_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)
            
        return await self.repository.update(workflow)

    async def delete_workflow(self, workflow_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            return False
        return await self.repository.delete(workflow_id)
