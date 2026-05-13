from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from apps.api.app.api.deps import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut, WorkflowList
from apps.api.app.services.workflow_service import WorkflowService

router = APIRouter()

@router.post("/", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_in: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WorkflowService(db)
    return await service.create_workflow(user_id=current_user.id, workflow_in=workflow_in)

@router.get("/", response_model=WorkflowList)
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WorkflowService(db)
    workflows = await service.list_workflows(user_id=current_user.id)
    return {"items": workflows, "total": len(workflows)}

@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied"
        )
    return workflow

@router.put("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: UUID,
    workflow_in: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WorkflowService(db)
    workflow = await service.update_workflow(
        workflow_id=workflow_id, user_id=current_user.id, workflow_in=workflow_in
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied"
        )
    return workflow

@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WorkflowService(db)
    success = await service.delete_workflow(workflow_id=workflow_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied"
        )
    return None

@router.post("/{workflow_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def run_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # This will be implemented in Phase 3/4
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id=workflow_id, user_id=current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or access denied"
        )
    return {"execution_id": "manual-run-pending"}
