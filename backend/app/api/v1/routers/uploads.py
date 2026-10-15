from typing import Optional
from fastapi import APIRouter, Depends, File, Header, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.core.errors import ConfluxException
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
    # Enforce bounded memory streaming to prevent container OOM
    max_bytes = settings.MAX_UPLOAD_SIZE_BYTES
    chunk_size = 1024 * 1024  # 1 MB chunk
    total_read = 0
    chunks = []

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > max_bytes:
            raise ConfluxException(
                "PAYLOAD_TOO_LARGE",
                f"File size exceeds maximum allowed direct upload size of {max_bytes // (1024 * 1024)} MB.",
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        chunks.append(chunk)

    content = b"".join(chunks)
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
