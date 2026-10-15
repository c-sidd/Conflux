from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.operation import (
    ConfirmSourceRemovalRequest,
    FileOperationResponse,
)
from app.services.operation_service import OperationService

router = APIRouter(prefix="/operations", tags=["Operations Center"])


@router.get("", response_model=PaginatedResponse[FileOperationResponse])
async def list_operations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = OperationService(db)
    items, total = await service.list_operations(current_user.id, limit=limit, offset=offset)
    return PaginatedResponse(items=items, total_count=total)


@router.get("/{operation_id}", response_model=FileOperationResponse)
async def get_operation(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = OperationService(db)
    return await service.get_operation(operation_id, current_user.id)


@router.post("/{operation_id}/confirm-source-removal", response_model=FileOperationResponse)
async def confirm_source_removal(
    operation_id: str,
    req: ConfirmSourceRemovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = OperationService(db)
    return await service.confirm_source_removal(operation_id, current_user.id)


@router.post("/{operation_id}/cancel", response_model=FileOperationResponse)
async def cancel_operation(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = OperationService(db)
    return await service.cancel_operation(operation_id, current_user.id)
