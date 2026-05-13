import uuid
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.models.workflow import Workflow

class WorkflowRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, workflow_id: uuid.UUID) -> Optional[Workflow]:
        result = await self.db.execute(select(Workflow).where(Workflow.id == workflow_id))
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> List[Workflow]:
        result = await self.db.execute(
            select(Workflow).where(Workflow.user_id == user_id).order_by(Workflow.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, workflow: Workflow) -> Workflow:
        self.db.add(workflow)
        await self.db.commit()
        await self.db.refresh(workflow)
        return workflow

    async def update(self, workflow: Workflow) -> Workflow:
        await self.db.commit()
        await self.db.refresh(workflow)
        return workflow

    async def delete(self, workflow_id: uuid.UUID) -> bool:
        workflow = await self.get_by_id(workflow_id)
        if workflow:
            await self.db.delete(workflow)
            await self.db.commit()
            return True
        return False
