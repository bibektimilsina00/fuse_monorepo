from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.services.workflow_service import WorkflowService

router = APIRouter()


class A2ARequest(BaseModel):
    message: str = ""
    trigger_data: dict[str, Any] = {}
    input_data: dict[str, Any] | None = None


@router.post("/{workflow_id}")
async def a2a_call(
    workflow_id: uuid.UUID,
    body: A2ARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A2A endpoint — trigger a workflow synchronously and return its output."""
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id, current_user)

    trigger_data = body.input_data or body.trigger_data
    if body.message:
        trigger_data = {"message": body.message, **trigger_data}

    from apps.api.app.execution_engine.engine import execution_engine

    execution_id = await execution_engine.trigger_workflow(
        workflow_id=workflow.id,
        graph=workflow.graph,
        trigger_type="a2a",
        input_data=trigger_data,
    )

    return {
        "execution_id": str(execution_id),
        "status": "running",
        "output": None,
    }


@router.get("/{workflow_id}/status/{execution_id}")
async def a2a_get_status(
    workflow_id: uuid.UUID,
    execution_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current status + output of an A2A execution."""
    from apps.api.app.repositories.execution_repository import ExecutionRepository

    repo = ExecutionRepository(db)
    execution = await repo.get_by_id(execution_id)
    if not execution or execution.workflow_id != workflow_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

    return {
        "execution_id": str(execution_id),
        "status": execution.status,
        "output": execution.output_data,
    }


@router.delete("/{workflow_id}/{execution_id}", status_code=status.HTTP_200_OK)
async def a2a_cancel(
    workflow_id: uuid.UUID,
    execution_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a running A2A execution by marking it failed."""
    from apps.api.app.repositories.execution_repository import ExecutionRepository

    repo = ExecutionRepository(db)
    execution = await repo.get_by_id(execution_id)
    if not execution or execution.workflow_id != workflow_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")

    if execution.status not in ("pending", "running"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel execution in status '{execution.status}'",
        )

    await repo.update_status(execution_id, "failed")
    return {"execution_id": str(execution_id), "status": "cancelled"}
