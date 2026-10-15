import json
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.errors import (
    ConfluxException,
    PermissionDeniedException,
    ProviderReauthRequiredException,
    QuotaInsufficientException,
    ResourceNotFoundException,
    UnsupportedCapabilityException,
)
from app.core.logging import logger
from app.providers.base import BaseStorageProvider

GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


class GoogleDriveProvider(BaseStorageProvider):
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET

    async def _get_access_token(self, refresh_token: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URI,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=15.0,
            )
            if resp.status_code == 400:
                data = resp.json()
                if data.get("error") in ("invalid_grant", "unauthorized_client"):
                    raise ProviderReauthRequiredException("Google refresh token revoked or expired")
                raise ConfluxException("OAUTH_ERROR", f"OAuth token refresh error: {data.get('error')}")
            resp.raise_for_status()
            return resp.json()["access_token"]

    def _headers(self, access_token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

    async def _handle_api_error(self, resp: httpx.Response) -> None:
        if resp.status_code == 401:
            raise ProviderReauthRequiredException("Google access token expired or invalid")
        elif resp.status_code == 403:
            try:
                data = resp.json()
                err = data.get("error", {})
                reasons = [e.get("reason") for e in err.get("errors", [])]
                if "rateLimitExceeded" in reasons or "userRateLimitExceeded" in reasons:
                    raise ConfluxException("PROVIDER_RATE_LIMITED", "Google Drive rate limit exceeded", status_code=429)
                if "storageQuotaExceeded" in reasons:
                    raise QuotaInsufficientException("Google Drive storage quota exceeded")
            except (ValueError, TypeError):
                pass
            raise PermissionDeniedException("Insufficient Google Drive permissions")
        elif resp.status_code == 404:
            raise ResourceNotFoundException("File or folder not found on Google Drive")
        elif resp.status_code == 429:
            raise ConfluxException("PROVIDER_RATE_LIMITED", "Google Drive rate limit exceeded", status_code=429)
        resp.raise_for_status()

    async def get_about(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        fields = "user,storageQuota,rootFolderId"
        url = f"{GOOGLE_DRIVE_API_BASE}/about?fields={fields}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers(access_token), timeout=15.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def list_files(
        self,
        credentials: Dict[str, Any],
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        page_size: int = 100,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        fields = "nextPageToken,files(id,name,mimeType,parents,size,modifiedTime,createdTime,webViewLink,trashed,capabilities)"

        q_clauses = ["trashed = false"]
        if folder_id:
            q_clauses.append(f"'{folder_id}' in parents")
        if query:
            safe_q = query.replace("'", "\\'")
            q_clauses.append(f"name contains '{safe_q}'")

        params = {
            "fields": fields,
            "pageSize": min(page_size, 100),
            "q": " and ".join(q_clauses),
            "supportsAllDrives": "false",
        }
        if page_token:
            params["pageToken"] = page_token

        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{GOOGLE_DRIVE_API_BASE}/files", headers=self._headers(access_token), params=params, timeout=20.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def get_file_metadata(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        fields = "id,name,mimeType,parents,size,modifiedTime,createdTime,webViewLink,trashed,capabilities"
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}?fields={fields}&supportsAllDrives=false"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers(access_token), timeout=15.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def upload_file(
        self,
        credentials: Dict[str, Any],
        name: str,
        content: bytes,
        mime_type: str,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        metadata = {"name": name, "mimeType": mime_type}
        if parent_id and parent_id != "root":
            metadata["parents"] = [parent_id]

        upload_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
        files = {
            "data": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
            "file": (name, content, mime_type),
        }
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            resp = await client.post(upload_url, headers=headers, files=files, timeout=60.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def download_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> AsyncGenerator[bytes, None]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}?alt=media"
        async with httpx.AsyncClient() as client:
            async with client.stream("GET", url, headers=self._headers(access_token), timeout=60.0) as resp:
                if not resp.is_success:
                    await self._handle_api_error(resp)
                async for chunk in resp.aiter_bytes():
                    yield chunk

    async def export_document(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        mime_type: str
    ) -> bytes:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}/export"
        params = {"mimeType": mime_type}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers(access_token), params=params, timeout=30.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.content

    async def rename_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        new_name: str
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                url,
                headers=self._headers(access_token),
                json={"name": new_name},
                timeout=15.0
            )
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def move_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        new_parent_id: str,
        old_parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}"
        params = {"addParents": new_parent_id}
        if old_parent_id:
            params["removeParents"] = old_parent_id

        async with httpx.AsyncClient() as client:
            resp = await client.patch(url, headers=self._headers(access_token), params=params, timeout=15.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def copy_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        destination_parent_id: Optional[str] = None,
        new_name: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}/copy"
        body: Dict[str, Any] = {}
        if new_name:
            body["name"] = new_name
        if destination_parent_id:
            body["parents"] = [destination_parent_id]

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=self._headers(access_token), json=body, timeout=30.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def trash_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                url,
                headers=self._headers(access_token),
                json={"trashed": True},
                timeout=15.0
            )
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def restore_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                url,
                headers=self._headers(access_token),
                json={"trashed": False},
                timeout=15.0
            )
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def delete_permanently(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> bool:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.delete(url, headers=self._headers(access_token), timeout=15.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return True

    async def get_changes(
        self,
        credentials: Dict[str, Any],
        saved_page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        async with httpx.AsyncClient() as client:
            # If no start token, get new start page token
            if not saved_page_token:
                token_resp = await client.get(
                    f"{GOOGLE_DRIVE_API_BASE}/changes/startPageToken",
                    headers=self._headers(access_token),
                    timeout=15.0
                )
                if not token_resp.is_success:
                    await self._handle_api_error(token_resp)
                saved_page_token = token_resp.json()["startPageToken"]

            url = f"{GOOGLE_DRIVE_API_BASE}/changes"
            params = {
                "pageToken": saved_page_token,
                "fields": "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,parents,size,modifiedTime,trashed))",
            }
            resp = await client.get(url, headers=self._headers(access_token), params=params, timeout=20.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()

    async def list_permissions(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> List[Dict[str, Any]]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}/permissions?fields=permissions(id,role,type,emailAddress,displayName)"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers(access_token), timeout=15.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json().get("permissions", [])

    async def create_permission(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        role: str,
        perm_type: str,
        email_address: Optional[str] = None
    ) -> Dict[str, Any]:
        access_token = credentials.get("access_token") or await self._get_access_token(credentials["refresh_token"])
        url = f"{GOOGLE_DRIVE_API_BASE}/files/{provider_file_id}/permissions"
        body = {"role": role, "type": perm_type}
        if email_address:
            body["emailAddress"] = email_address
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=self._headers(access_token), json=body, timeout=15.0)
            if not resp.is_success:
                await self._handle_api_error(resp)
            return resp.json()
