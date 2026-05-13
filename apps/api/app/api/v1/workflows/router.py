from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from apps.api.app.core.database import get_db
# from apps.api.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut
# from apps.api.services.workflow import workflow_service

router = APIRouter()

@router.get("/")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    return []

@router.post("/")
async def create_workflow(db: AsyncSession = Depends(get_db)):
    return {"id": "new-workflow-id"}
