from datetime import datetime, timezone
import json
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.crypto import token_cipher
from app.core.errors import ResourceNotFoundException
from app.core.logging import logger
from app.models.account import ConnectedAccount
from app.providers import get_storage_provider
from app.repositories.account_repo import AccountRepository
from app.repositories.file_repo import FileRepository


class SyncService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.account_repo = AccountRepository(db)
        self.file_repo = FileRepository(db)
        self.provider = get_storage_provider()

    async def _get_credentials(self, account: ConnectedAccount) -> Dict[str, Any]:
        credentials = {"email": account.email}
        if account.encrypted_refresh_token:
            try:
                decrypted = token_cipher.decrypt(json.loads(account.encrypted_refresh_token))
                credentials["refresh_token"] = decrypted
            except Exception:
                pass
        return credentials

    async def sync_account(self, account_id: str, user_id: str) -> Dict[str, Any]:
        acc = await self.account_repo.get_by_id(account_id, user_id)
        if not acc:
            raise ResourceNotFoundException("Account not found")

        sync_state = await self.account_repo.get_or_create_sync_state(account_id)
        creds = await self._get_credentials(acc)

        try:
            if not sync_state.change_cursor:
                # Initial Scan
                list_res = await self.provider.list_files(creds, page_size=100)
                files = list_res.get("files", [])
                synced_count = 0
                for f in files:
                    meta_dict = {
                        "user_id": user_id,
                        "connected_account_id": account_id,
                        "provider": "GOOGLE_DRIVE",
                        "provider_file_id": f["id"],
                        "name": f.get("name", "Untitled"),
                        "mime_type": f.get("mimeType", "application/octet-stream"),
                        "parent_provider_file_id": f.get("parents", ["root"])[0] if f.get("parents") else "root",
                        "size_bytes": int(f["size"]) if f.get("size") else None,
                        "modified_time_provider": datetime.fromisoformat(f["modifiedTime"]) if f.get("modifiedTime") else datetime.now(timezone.utc),
                        "trashed_provider": f.get("trashed", False),
                        "is_folder": f.get("mimeType") == "application/vnd.google-apps.folder",
                        "capability_snapshot": json.dumps(f.get("capabilities", {})),
                        "last_synced_at": datetime.now(timezone.utc),
                    }
                    await self.file_repo.upsert_metadata(meta_dict)
                    synced_count += 1

                # Initialize change tracking cursor
                changes_init = await self.provider.get_changes(creds)
                start_token = changes_init.get("newStartPageToken", "cursor-v1")
                await self.account_repo.update_sync_cursor(account_id, start_token, success=True)
                return {"status": "SUCCESS", "mode": "INITIAL_SCAN", "items_synced": synced_count}

            else:
                # Incremental change feed processing
                changes_res = await self.provider.get_changes(creds, saved_page_token=sync_state.change_cursor)
                changes = changes_res.get("changes", [])
                for change in changes:
                    if change.get("removed"):
                        existing = await self.file_repo.get_by_provider_file_id(account_id, change["fileId"], user_id)
                        if existing:
                            await self.file_repo.update_trashed_status(existing.id, user_id, trashed=True)
                    elif "file" in change:
                        f = change["file"]
                        meta_dict = {
                            "user_id": user_id,
                            "connected_account_id": account_id,
                            "provider": "GOOGLE_DRIVE",
                            "provider_file_id": f["id"],
                            "name": f.get("name", "Untitled"),
                            "mime_type": f.get("mimeType", "application/octet-stream"),
                            "parent_provider_file_id": f.get("parents", ["root"])[0] if f.get("parents") else "root",
                            "size_bytes": int(f["size"]) if f.get("size") else None,
                            "trashed_provider": f.get("trashed", False),
                            "is_folder": f.get("mimeType") == "application/vnd.google-apps.folder",
                            "last_synced_at": datetime.now(timezone.utc),
                        }
                        await self.file_repo.upsert_metadata(meta_dict)

                new_token = changes_res.get("newStartPageToken") or sync_state.change_cursor
                await self.account_repo.update_sync_cursor(account_id, new_token, success=True)
                return {"status": "SUCCESS", "mode": "INCREMENTAL", "changes_processed": len(changes)}

        except Exception as e:
            logger.error(f"Sync failed for account {account_id}: {str(e)}")
            await self.account_repo.update_sync_cursor(account_id, sync_state.change_cursor or "", success=False, error_code="SYNC_FAILED")
            return {"status": "FAILED", "error": str(e)}
