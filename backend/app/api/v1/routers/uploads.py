from typing import Optional
from fastapi import APIRouter, Depends, File, Header, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.operation import (
    CreateUploadRequest,
    FileOperationResponse,
    UploadResponse,
)
from app.services.operation_service import OperationService

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def create_upload(
    req: CreateUploadRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = OperationService(db)
    return await service.initiate_upload(
        user_id=current_user.id,
        req=req,
        idempotency_key=idempotency_key
    )


@router.post("/{operation_id}/complete", response_model=FileOperationResponse)
async def complete_upload(
    operation_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    service = OperationService(db)
    return await service.complete_upload(
        operation_id=operation_id,
        user_id=current_user.id,
        uploaded_bytes=content,
        filename=file.filename,
        mime_type=file.content_type
    )


@router.get("/{operation_id}", response_model=FileOperationResponse)
async def get_upload_status(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = OperationService(db)
    return await service.get_operation(operation_id, current_user.id)
