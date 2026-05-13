import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.models.workflow import Workflow


class WorkflowRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, workflow_id: uuid.UUID) -> Workflow | None:
        result = await self.db.execute(select(Workflow).where(Workflow.id == workflow_id))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Workflow]:
        result = await self.db.execute(select(Workflow))
        return result.scalars().all()

    async def create(self, workflow: Workflow) -> Workflow:
        self.db.add(workflow)
        await self.db.commit()
        await self.db.refresh(workflow)
        return workflow
