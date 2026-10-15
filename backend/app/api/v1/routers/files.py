from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.file import (
    CopyMoveRequest,
    FileMetadataResponse,
    FilePatchRequest,
    ToggleStarRequest,
)
from app.schemas.operation import FileOperationResponse
from app.services.file_service import FileService
from app.services.operation_service import OperationService

router = APIRouter(tags=["Files & Folders"])


@router.get("/files", response_model=PaginatedResponse[FileMetadataResponse])
async def list_unified_files(
    account_id: Optional[str] = Query(None),
    parent_id: Optional[str] = Query(None),
    is_root_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("modified_desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    items, total = await service.list_files(
        user_id=current_user.id,
        connected_account_id=account_id,
        parent_provider_file_id=parent_id,
        is_root_only=is_root_only,
        trashed=False,
        limit=limit,
        offset=offset,
        sort_by=sort_by
    )
    return PaginatedResponse(items=items, total_count=total)


@router.get("/accounts/{account_id}/files", response_model=PaginatedResponse[FileMetadataResponse])
async def list_account_files(
    account_id: str,
    parent_id: Optional[str] = Query(None),
    is_root_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("modified_desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    items, total = await service.list_files(
        user_id=current_user.id,
        connected_account_id=account_id,
        parent_provider_file_id=parent_id,
        is_root_only=is_root_only,
        trashed=False,
        limit=limit,
        offset=offset,
        sort_by=sort_by
    )
    return PaginatedResponse(items=items, total_count=total)


@router.get("/folders/{file_id}/children", response_model=PaginatedResponse[FileMetadataResponse])
async def list_folder_children(
    file_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    folder = await service.get_file(file_id, current_user.id)
    items, total = await service.list_files(
        user_id=current_user.id,
        connected_account_id=folder.connected_account_id,
        parent_provider_file_id=folder.provider_file_id,
        limit=limit,
        offset=offset
    )
    return PaginatedResponse(items=items, total_count=total)


@router.get("/files/starred", response_model=List[FileMetadataResponse])
async def list_starred_files(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    return await service.list_starred(current_user.id, limit=limit)


@router.get("/search", response_model=PaginatedResponse[FileMetadataResponse])
async def search_files(
    q: str = Query(..., min_length=1),
    account_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    items, total = await service.search(
        user_id=current_user.id,
        query=q,
        connected_account_id=account_id,
        limit=limit,
        offset=offset
    )
    return PaginatedResponse(items=items, total_count=total)


@router.get("/files/{file_id}", response_model=FileMetadataResponse)
async def get_file_metadata(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    return await service.get_file(file_id, current_user.id)


@router.patch("/files/{file_id}", response_model=FileMetadataResponse)
async def update_file_metadata(
    file_id: str,
    req: FilePatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    if req.name:
        return await service.rename_file(file_id, current_user.id, req.name)
    return await service.get_file(file_id, current_user.id)


@router.post("/files/{file_id}/star", status_code=status.HTTP_200_OK)
async def toggle_star(
    file_id: str,
    req: ToggleStarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    await service.toggle_star(file_id, current_user.id, req.is_starred)
    return {"message": "Star preference updated"}


@router.post("/files/{file_id}/copy", response_model=FileOperationResponse, status_code=status.HTTP_202_ACCEPTED)
async def copy_file(
    file_id: str,
    req: CopyMoveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    op_service = OperationService(db)
    return await op_service.initiate_copy(
        file_id=file_id,
        user_id=current_user.id,
        destination_account_id=req.destination_account_id,
        destination_parent_id=req.destination_parent_file_id
    )


@router.post("/files/{file_id}/move", response_model=FileOperationResponse, status_code=status.HTTP_202_ACCEPTED)
async def move_file(
    file_id: str,
    req: CopyMoveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    op_service = OperationService(db)
    return await op_service.initiate_move(
        file_id=file_id,
        user_id=current_user.id,
        destination_account_id=req.destination_account_id,
        destination_parent_id=req.destination_parent_file_id
    )


@router.post("/files/{file_id}/trash", status_code=status.HTTP_200_OK)
async def move_to_trash(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    await service.trash_file(file_id, current_user.id)
    return {"message": "File moved to trash"}


@router.post("/files/{file_id}/restore", status_code=status.HTTP_200_OK)
async def restore_from_trash(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    await service.restore_file(file_id, current_user.id)
    return {"message": "File restored from trash"}


@router.delete("/files/{file_id}", status_code=status.HTTP_200_OK)
async def delete_permanently(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    await service.delete_permanently(file_id, current_user.id)
    return {"message": "File permanently deleted from Google Drive"}


@router.get("/files/{file_id}/content")
async def download_file_content(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    stream, meta = await service.download_file_stream(file_id, current_user.id)
    headers = {
        "Content-Disposition": f'attachment; filename="{meta.name}"',
        "Content-Type": meta.mime_type or "application/octet-stream",
    }
    return StreamingResponse(stream, headers=headers)


@router.get("/files/{file_id}/export")
async def export_google_doc(
    file_id: str,
    mime_type: str = Query("application/pdf"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = FileService(db)
    content, meta = await service.export_document_bytes(file_id, current_user.id, mime_type)
    ext = "pdf" if "pdf" in mime_type else "bin"
    headers = {
        "Content-Disposition": f'attachment; filename="{meta.name}.{ext}"',
        "Content-Type": mime_type,
    }
    return Response(content=content, headers=headers)
