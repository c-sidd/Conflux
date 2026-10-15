from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.trash import TrashItemResponse
from app.services.file_service import FileService

router = APIRouter(prefix="/trash", tags=["Trash"])


@router.get("", response_model=List[TrashItemResponse])
async def list_trash_items(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    items, _ = await service.repo.list_files(
        user_id=current_user.id,
        trashed=True,
        limit=limit
    )

    responses = []
    for meta, email, _ in items:
        responses.append(
            TrashItemResponse(
                id=meta.id,
                connected_account_id=meta.connected_account_id,
                source_account_email=email,
                provider_file_id=meta.provider_file_id,
                name=meta.name,
                mime_type=meta.mime_type,
                size_bytes=meta.size_bytes,
                trashed_at=meta.updated_at,
                recoverable=True,
                recovery_status="RECOVERABLE",
                created_at=meta.created_at,
            )
        )
    return responses
