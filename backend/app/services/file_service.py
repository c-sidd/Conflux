import io
import json
import zipfile
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.crypto import token_cipher
from app.core.errors import (
    PermissionDeniedException,
    ResourceNotFoundException,
    UnsupportedCapabilityException,
)
from app.models.file import FileMetadata
from app.providers import get_storage_provider
from app.repositories.account_repo import AccountRepository
from app.repositories.file_repo import FileRepository
from app.schemas.file import FileCapabilities, FileMetadataResponse


class FileService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FileRepository(db)
        self.account_repo = AccountRepository(db)
        self.provider = get_storage_provider()

    async def _get_credentials_for_account(self, account_id: str, user_id: str) -> Dict[str, Any]:
        acc = await self.account_repo.get_by_id(account_id, user_id)
        if not acc:
            raise ResourceNotFoundException("Connected account not found")
        if acc.connection_status != "CONNECTED":
            raise PermissionDeniedException(f"Account {acc.email} is {acc.connection_status}. Re-authorization required.")

        credentials = {"email": acc.email}
        if acc.encrypted_refresh_token:
            try:
                decrypted = token_cipher.decrypt(json.loads(acc.encrypted_refresh_token))
                credentials["refresh_token"] = decrypted
            except Exception:
                pass
        return credentials

    def _to_response_dto(
        self,
        file_meta: FileMetadata,
        account_email: Optional[str] = None,
        is_starred: bool = False
    ) -> FileMetadataResponse:
        caps_dict = {}
        if file_meta.capability_snapshot:
            try:
                caps_dict = json.loads(file_meta.capability_snapshot)
            except Exception:
                pass

        caps = FileCapabilities(
            can_trash=caps_dict.get("canTrash", True),
            can_restore=caps_dict.get("canRestore", True),
            can_delete=caps_dict.get("canDelete", True),
            can_rename=caps_dict.get("canRename", True),
            can_move=caps_dict.get("canMove", True),
            can_copy=caps_dict.get("canCopy", True),
            can_share=caps_dict.get("canShare", True),
            can_download=caps_dict.get("canDownload", not file_meta.is_folder),
            can_export="google-apps" in (file_meta.mime_type or ""),
        )

        return FileMetadataResponse(
            id=file_meta.id,
            connected_account_id=file_meta.connected_account_id,
            source_account_email=account_email,
            provider=file_meta.provider,
            provider_file_id=file_meta.provider_file_id,
            name=file_meta.name,
            mime_type=file_meta.mime_type,
            description=file_meta.description,
            parent_provider_file_id=file_meta.parent_provider_file_id,
            size_bytes=file_meta.size_bytes,
            modified_time_provider=file_meta.modified_time_provider,
            created_time_provider=file_meta.created_time_provider,
            web_view_link=file_meta.web_view_link,
            trashed_provider=file_meta.trashed_provider,
            is_folder=file_meta.is_folder,
            is_shortcut=file_meta.is_shortcut,
            is_starred=is_starred,
            capabilities=caps,
            last_synced_at=file_meta.last_synced_at,
            created_at=file_meta.created_at,
            updated_at=file_meta.updated_at,
        )

    async def get_file(self, file_id: str, user_id: str) -> FileMetadataResponse:
        res = await self.repo.get_by_id(file_id, user_id)
        if not res:
            raise ResourceNotFoundException("File not found")
        meta, email, starred = res
        return self._to_response_dto(meta, email, starred)

    async def list_files(
        self,
        user_id: str,
        connected_account_id: Optional[str] = None,
        parent_provider_file_id: Optional[str] = None,
        is_root_only: bool = False,
        trashed: bool = False,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "modified_desc"
    ) -> Tuple[List[FileMetadataResponse], int]:
        items, total = await self.repo.list_files(
            user_id=user_id,
            connected_account_id=connected_account_id,
            parent_provider_file_id=parent_provider_file_id,
            is_root_only=is_root_only,
            trashed=trashed,
            limit=limit,
            offset=offset,
            sort_by=sort_by
        )
        return [self._to_response_dto(meta, email, starred) for meta, email, starred in items], total

    async def search(
        self,
        user_id: str,
        query: str,
        connected_account_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[FileMetadataResponse], int]:
        items, total = await self.repo.search_files(user_id, query, connected_account_id, limit, offset)
        return [self._to_response_dto(meta, email, starred) for meta, email, starred in items], total

    async def list_starred(self, user_id: str, limit: int = 50) -> List[FileMetadataResponse]:
        items = await self.repo.list_starred(user_id, limit)
        return [self._to_response_dto(meta, email, starred) for meta, email, starred in items]

    async def toggle_star(self, file_id: str, user_id: str, is_starred: bool) -> None:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        await self.repo.set_starred(user_id, file_id, is_starred)

    async def rename_file(self, file_id: str, user_id: str, new_name: str) -> FileMetadataResponse:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        meta, email, starred = file_res

        creds = await self._get_credentials_for_account(meta.connected_account_id, user_id)
        provider_res = await self.provider.rename_file(creds, meta.provider_file_id, new_name)

        meta.name = provider_res.get("name", new_name)
        meta.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(meta)

        await self.repo.record_activity(user_id, "RENAMED", meta.id, meta.connected_account_id)
        return self._to_response_dto(meta, email, starred)

    async def trash_file(self, file_id: str, user_id: str) -> None:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        meta, _, _ = file_res

        creds = await self._get_credentials_for_account(meta.connected_account_id, user_id)
        await self.provider.trash_file(creds, meta.provider_file_id)
        await self.repo.update_trashed_status(file_id, user_id, trashed=True)
        await self.repo.record_activity(user_id, "TRASHED", meta.id, meta.connected_account_id)

    async def restore_file(self, file_id: str, user_id: str) -> None:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        meta, _, _ = file_res

        creds = await self._get_credentials_for_account(meta.connected_account_id, user_id)
        await self.provider.restore_file(creds, meta.provider_file_id)
        await self.repo.update_trashed_status(file_id, user_id, trashed=False)
        await self.repo.record_activity(user_id, "RESTORED", meta.id, meta.connected_account_id)

    async def delete_permanently(self, file_id: str, user_id: str) -> None:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        meta, _, _ = file_res

        creds = await self._get_credentials_for_account(meta.connected_account_id, user_id)
        await self.provider.delete_permanently(creds, meta.provider_file_id)
        await self.repo.delete_permanently(file_id, user_id)

    async def download_file_stream(self, file_id: str, user_id: str) -> Tuple[AsyncGenerator[bytes, None], FileMetadata]:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        meta, _, _ = file_res

        if meta.is_folder:
            raise UnsupportedCapabilityException("Folders cannot be downloaded directly as a single file")

        creds = await self._get_credentials_for_account(meta.connected_account_id, user_id)
        stream = self.provider.download_file(creds, meta.provider_file_id)
        await self.repo.record_activity(user_id, "DOWNLOADED", meta.id, meta.connected_account_id)
        return stream, meta

    async def export_document_bytes(self, file_id: str, user_id: str, target_mime_type: str) -> Tuple[bytes, FileMetadata]:
        file_res = await self.repo.get_by_id(file_id, user_id)
        if not file_res:
            raise ResourceNotFoundException("File not found")
        meta, _, _ = file_res

        if "google-apps" not in (meta.mime_type or ""):
            raise UnsupportedCapabilityException("Only Google Docs/Sheets/Slides can be exported via export endpoint")

        creds = await self._get_credentials_for_account(meta.connected_account_id, user_id)
        content_bytes = await self.provider.export_document(creds, meta.provider_file_id, target_mime_type)
        return content_bytes, meta
