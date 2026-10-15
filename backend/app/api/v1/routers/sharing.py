from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.sharing import CreatePermissionRequest, PermissionResponse
from app.services.file_service import FileService

router = APIRouter(prefix="/files/{file_id}/permissions", tags=["Sharing & Permissions"])


@router.get("", response_model=List[PermissionResponse])
async def list_file_permissions(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    meta = await service.get_file(file_id, current_user.id)
    creds = await service._get_credentials_for_account(meta.connected_account_id, current_user.id)
    raw_perms = await service.provider.list_permissions(creds, meta.provider_file_id)
    return [
        PermissionResponse(
            id=p.get("id", "perm"),
            role=p.get("role", "reader"),
            type=p.get("type", "user"),
            email_address=p.get("emailAddress"),
            display_name=p.get("displayName"),
        )
        for p in raw_perms
    ]


@router.post("", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_file_permission(
    file_id: str,
    req: CreatePermissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    meta = await service.get_file(file_id, current_user.id)
    creds = await service._get_credentials_for_account(meta.connected_account_id, current_user.id)
    created = await service.provider.create_permission(
        creds,
        meta.provider_file_id,
        role=req.role,
        perm_type=req.type,
        email_address=req.email_address
    )
    return PermissionResponse(
        id=created.get("id", "perm"),
        role=created.get("role", req.role),
        type=created.get("type", req.type),
        email_address=created.get("emailAddress", req.email_address),
    )
