from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.schemas.execution import ExecutionOut

router = APIRouter()


class ResumeRequest(BaseModel):
    token: str
    input: dict[str, Any] = {}


@router.get("/", response_model=list[ExecutionOut])
async def list_executions(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ExecutionRepository(db)
    return await repo.list_by_workflow(workflow_id)


@router.get("/{execution_id}", response_model=ExecutionOut)
async def get_execution(
    execution_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ExecutionRepository(db)
    execution = await repo.get_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return execution


@router.post("/{execution_id}/resume", status_code=status.HTTP_202_ACCEPTED)
async def resume_execution(
    execution_id: uuid.UUID,
    body: ResumeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resume a paused execution. No auth required — token is the secret."""
    repo = ExecutionRepository(db)
    execution = await repo.get_paused(execution_id, body.token)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paused execution not found or token invalid",
        )

    from apps.worker.app.jobs.tasks import execute_workflow
    execute_workflow.delay(
        execution_id=str(execution_id),
        workflow_id=str(execution.workflow_id),
        graph=execution.snapshot.get("graph", {}) if execution.snapshot else {},
        trigger_data={},
        resume_from=execution.paused_node_id,
        resume_input=body.input,
        snapshot=execution.snapshot,
    )
    return {"status": "resuming", "execution_id": str(execution_id)}
