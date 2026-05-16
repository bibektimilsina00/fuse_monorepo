import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.schemas.workflow import (
    WorkflowBatchUpdate,
    WorkflowCreate,
    WorkflowOut,
    WorkflowUpdate,
)
from apps.api.app.services.workflow_service import WorkflowService

router = APIRouter()


@router.get("/", response_model=list[WorkflowOut])
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.list_workflows(current_user)


@router.post("/", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.create_workflow(data, current_user)


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.get_workflow(workflow_id, current_user)


@router.put("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: uuid.UUID,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.update_workflow(workflow_id, data, current_user)


@router.patch("/batch", status_code=status.HTTP_204_NO_CONTENT)
async def batch_update_workflows(
    data: WorkflowBatchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from apps.api.app.core.logger import logger

    logger.info(f"Received batch update request: {data.model_dump_json()}")
    service = WorkflowService(db)
    await service.batch_update_workflows(data, current_user)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    await service.delete_workflow(workflow_id, current_user)


@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id, current_user)

    from apps.api.app.execution_engine.engine import execution_engine

    execution_id = await execution_engine.trigger_workflow(
        workflow_id=workflow.id,
        graph=workflow.graph,
        trigger_type="manual",
    )
    return {"execution_id": str(execution_id)}
