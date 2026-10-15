import io
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional
from app.providers.base import BaseStorageProvider


class FakeStorageProvider(BaseStorageProvider):
    """
    In-memory storage provider that mimics Google Drive API v3.
    Used for local development and deterministic unit/integration tests.
    """

    def __init__(self):
        # account_id -> {file_id -> file_dict}
        self.accounts: Dict[str, Dict[str, Any]] = {}
        self.files_data: Dict[str, bytes] = {}
        self.change_tokens: Dict[str, int] = {}

    def _ensure_account(self, account_email: str) -> None:
        if account_email not in self.accounts:
            self.accounts[account_email] = {}
            self.change_tokens[account_email] = 1
            # Add seed files for realistic demo
            root_id = "root"
            folder1_id = f"fake-fld-docs-{account_email[:5]}"
            file1_id = f"fake-file-spec-{account_email[:5]}"
            file2_id = f"fake-file-img-{account_email[:5]}"

            self.accounts[account_email][folder1_id] = {
                "id": folder1_id,
                "name": "Project Documents",
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [root_id],
                "size": None,
                "modifiedTime": datetime.now(timezone.utc).isoformat(),
                "trashed": False,
                "capabilities": {"canTrash": True, "canDelete": True, "canRename": True, "canCopy": False},
            }
            self.accounts[account_email][file1_id] = {
                "id": file1_id,
                "name": "Architecture_Spec.pdf",
                "mimeType": "application/pdf",
                "parents": [folder1_id],
                "size": "2048576",
                "modifiedTime": datetime.now(timezone.utc).isoformat(),
                "trashed": False,
                "capabilities": {"canTrash": True, "canDelete": True, "canRename": True, "canCopy": True},
            }
            self.files_data[file1_id] = b"%PDF-1.4 Fake PDF Content for Conflux Spec"

            self.accounts[account_email][file2_id] = {
                "id": file2_id,
                "name": "Q3_Roadmap.gdoc",
                "mimeType": "application/vnd.google-apps.document",
                "parents": [root_id],
                "size": None,
                "modifiedTime": datetime.now(timezone.utc).isoformat(),
                "trashed": False,
                "capabilities": {"canTrash": True, "canDelete": True, "canRename": True, "canCopy": True},
            }
            self.files_data[file2_id] = b"Fake Google Docs Text Content"

    async def get_about(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        used_bytes = sum(int(f.get("size") or 0) for f in self.accounts[email].values() if not f.get("trashed"))
        return {
            "user": {
                "displayName": email.split("@")[0].capitalize(),
                "emailAddress": email,
                "permissionId": f"perm-{email}",
            },
            "storageQuota": {
                "limit": "16106127360",  # 15 GB
                "usage": str(used_bytes + 2147483648),  # Simulated ~2GB used
                "usageInDrive": str(used_bytes),
            },
            "rootFolderId": "root",
        }

    async def list_files(
        self,
        credentials: Dict[str, Any],
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        page_size: int = 100,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        files = list(self.accounts[email].values())

        filtered = []
        for f in files:
            if f.get("trashed", False):
                continue
            if folder_id:
                parents = f.get("parents", [])
                if folder_id not in parents:
                    continue
            if query and query.lower() not in f.get("name", "").lower():
                continue
            filtered.append(f)

        return {
            "files": filtered[:page_size],
            "nextPageToken": None,
        }

    async def get_file_metadata(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        if provider_file_id in self.accounts[email]:
            return self.accounts[email][provider_file_id]
        raise Exception(f"File {provider_file_id} not found on Google Drive")

    async def upload_file(
        self,
        credentials: Dict[str, Any],
        name: str,
        content: bytes,
        mime_type: str,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        file_id = f"fake-file-{uuid.uuid4().hex[:8]}"
        file_meta = {
            "id": file_id,
            "name": name,
            "mimeType": mime_type,
            "parents": [parent_id or "root"],
            "size": str(len(content)),
            "modifiedTime": datetime.now(timezone.utc).isoformat(),
            "trashed": False,
            "capabilities": {"canTrash": True, "canDelete": True, "canRename": True, "canCopy": True},
        }
        self.accounts[email][file_id] = file_meta
        self.files_data[file_id] = content
        self.change_tokens[email] += 1
        return file_meta

    async def download_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> AsyncGenerator[bytes, None]:
        data = self.files_data.get(provider_file_id, b"Dummy content bytes from Conflux")
        chunk_size = 64 * 1024
        for i in range(0, len(data), chunk_size):
            yield data[i:i + chunk_size]

    async def export_document(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        mime_type: str
    ) -> bytes:
        data = self.files_data.get(provider_file_id, b"Exported Google Doc content")
        return b"%PDF-1.4 " + data

    async def rename_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        new_name: str
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        if provider_file_id in self.accounts[email]:
            self.accounts[email][provider_file_id]["name"] = new_name
            self.accounts[email][provider_file_id]["modifiedTime"] = datetime.now(timezone.utc).isoformat()
            self.change_tokens[email] += 1
            return self.accounts[email][provider_file_id]
        raise Exception(f"File {provider_file_id} not found")

    async def move_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        new_parent_id: str,
        old_parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        if provider_file_id in self.accounts[email]:
            self.accounts[email][provider_file_id]["parents"] = [new_parent_id]
            self.accounts[email][provider_file_id]["modifiedTime"] = datetime.now(timezone.utc).isoformat()
            self.change_tokens[email] += 1
            return self.accounts[email][provider_file_id]
        raise Exception(f"File {provider_file_id} not found")

    async def copy_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        destination_parent_id: Optional[str] = None,
        new_name: Optional[str] = None
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        orig = await self.get_file_metadata(credentials, provider_file_id)
        new_id = f"fake-copy-{uuid.uuid4().hex[:8]}"
        copied_meta = {
            "id": new_id,
            "name": new_name or f"Copy of {orig['name']}",
            "mimeType": orig["mimeType"],
            "parents": [destination_parent_id or "root"],
            "size": orig.get("size"),
            "modifiedTime": datetime.now(timezone.utc).isoformat(),
            "trashed": False,
            "capabilities": orig.get("capabilities", {}),
        }
        self.accounts[email][new_id] = copied_meta
        self.files_data[new_id] = self.files_data.get(provider_file_id, b"")
        self.change_tokens[email] += 1
        return copied_meta

    async def trash_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        if provider_file_id in self.accounts[email]:
            self.accounts[email][provider_file_id]["trashed"] = True
            self.change_tokens[email] += 1
            return self.accounts[email][provider_file_id]
        raise Exception(f"File {provider_file_id} not found")

    async def restore_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        if provider_file_id in self.accounts[email]:
            self.accounts[email][provider_file_id]["trashed"] = False
            self.change_tokens[email] += 1
            return self.accounts[email][provider_file_id]
        raise Exception(f"File {provider_file_id} not found")

    async def delete_permanently(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> bool:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        if provider_file_id in self.accounts[email]:
            del self.accounts[email][provider_file_id]
            self.files_data.pop(provider_file_id, None)
            self.change_tokens[email] += 1
            return True
        return False

    async def get_changes(
        self,
        credentials: Dict[str, Any],
        saved_page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        email = credentials.get("email", "primary@example.com")
        self._ensure_account(email)
        current_token = str(self.change_tokens[email])
        files = list(self.accounts[email].values())
        return {
            "changes": [{"fileId": f["id"], "file": f, "removed": f.get("trashed", False)} for f in files],
            "newStartPageToken": str(self.change_tokens[email] + 1),
        }

    async def list_permissions(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> List[Dict[str, Any]]:
        return [
            {"id": "perm-owner", "role": "owner", "type": "user", "emailAddress": credentials.get("email")},
            {"id": "perm-anyone", "role": "reader", "type": "anyone"}
        ]

    async def create_permission(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        role: str,
        perm_type: str,
        email_address: Optional[str] = None
    ) -> Dict[str, Any]:
        return {
            "id": f"perm-{uuid.uuid4().hex[:6]}",
            "role": role,
            "type": perm_type,
            "emailAddress": email_address,
        }
