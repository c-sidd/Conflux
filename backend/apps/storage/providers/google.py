import io
import logging
from typing import BinaryIO, Dict, Any, Tuple
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from django.conf import settings
from .base import StorageProvider

logger = logging.getLogger(__name__)

class GoogleDriveProvider(StorageProvider):
    def __init__(self, access_token: str, refresh_token: str):
        if not settings.GOOGLE_CLIENT_ID:
            logger.info("GOOGLE_CLIENT_ID is empty. GoogleDriveProvider running in MOCK mode.")
            self.service = None
            return
        self.credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )
        self.service = build('drive', 'v3', credentials=self.credentials, cache_discovery=False)

    def _handle_http_error(self, e: HttpError, endpoint: str):
        status_code = e.resp.status
        content = e.content.decode('utf-8') if e.content else ""
        logger.error(
            f"Google Drive API Request Failed! Endpoint: {endpoint} | "
            f"HTTP Status: {status_code} | Error: {content}"
        )
        raise e

    def get_quota(self) -> Tuple[int, int]:
        if not self.service:
            return 15 * 1024 * 1024 * 1024, 1024 * 1024
        try:
            about = self.service.about().get(fields="storageQuota").execute()
            quota = about.get('storageQuota', {})
            return int(quota.get('limit', 0)), int(quota.get('usage', 0))
        except HttpError as e:
            self._handle_http_error(e, "drive.about.get")
        except Exception as e:
            logger.error(f"Non-HTTP Error in get_quota: {str(e)}")
            raise

    def get_or_create_folder(self, folder_name: str, parent_id: str = None) -> str:
        if not self.service:
            import uuid
            return f"mock_folder_{uuid.uuid4().hex[:8]}"
        try:
            # Google Drive query strings require single quotes to be escaped.
            safe_name = folder_name.replace('\\', '\\\\').replace("'", "\\'")
            q = f"name = '{safe_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            if parent_id:
                q += f" and '{parent_id}' in parents"

            results = self.service.files().list(
                q=q,
                fields="files(id, name)",
                pageSize=1,
                spaces='drive'
            ).execute()
            files = results.get('files', [])
            if files:
                return files[0]['id']

            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            if parent_id:
                folder_metadata['parents'] = [parent_id]

            created_folder = self.service.files().create(
                body=folder_metadata,
                fields='id'
            ).execute()
            return created_folder.get('id')
        except HttpError as e:
            self._handle_http_error(e, "drive.files.list/create")
        except Exception as e:
            logger.error(f"Error in get_or_create_folder: {str(e)}")
            raise

    def get_or_create_workspace_root(self) -> str:
        from apps.common.branding import WORKSPACE_FOLDER_NAME
        return self.get_or_create_folder(WORKSPACE_FOLDER_NAME)

    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str, parent_id: str = None) -> Dict[str, Any]:
        if not self.service:
            import uuid
            file_obj.seek(0, io.SEEK_END)
            file_size = file_obj.tell()
            file_obj.seek(0)
            return {
                'provider_file_id': f"mock_file_{uuid.uuid4().hex[:8]}",
                'size': file_size,
                'web_view_link': f"https://drive.google.com/mock/{uuid.uuid4().hex}"
            }
        try:
            file_metadata = {'name': filename}
            if parent_id:
                file_metadata['parents'] = [parent_id]

            media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, size, webViewLink'
            ).execute()

            return {
                'provider_file_id': file.get('id'),
                'size': int(file.get('size', 0)),
                'web_view_link': file.get('webViewLink')
            }
        except HttpError as e:
            self._handle_http_error(e, "drive.files.create")
        except Exception as e:
            logger.error(f"Non-HTTP Error in upload_file: {str(e)}")
            raise

    def download_file(self, provider_file_id: str) -> BinaryIO:
        if not self.service:
            return io.BytesIO(b"Simulated Google Drive file contents from Conflux mock provider.")
        try:
            request = self.service.files().get_media(fileId=provider_file_id)
            file_obj = io.BytesIO()
            downloader = MediaIoBaseDownload(file_obj, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            file_obj.seek(0)
            return file_obj
        except HttpError as e:
            self._handle_http_error(e, f"drive.files.get_media(fileId='{provider_file_id}')")
        except Exception as e:
            logger.error(f"Non-HTTP Error in download_file: {str(e)}")
            raise

    def delete_file(self, provider_file_id: str) -> bool:
        if not self.service:
            return True
        try:
            self.service.files().delete(fileId=provider_file_id).execute()
            return True
        except HttpError as e:
            try:
                self._handle_http_error(e, f"drive.files.delete(fileId='{provider_file_id}')")
            except Exception:
                pass
            return False
        except Exception as e:
            logger.error(f"Non-HTTP Error in delete_file: {str(e)}")
            return False

    def rename_object(self, provider_file_id: str, new_name: str) -> bool:
        if not self.service:
            return True
        try:
            self.service.files().update(fileId=provider_file_id, body={'name': new_name}).execute()
            return True
        except HttpError as e:
            self._handle_http_error(e, f"drive.files.update(fileId='{provider_file_id}')")
            return False
        except Exception as e:
            logger.error(f"Non-HTTP Error in rename_object: {str(e)}")
            return False

    def move_object(self, provider_file_id: str, previous_parent_id: str, new_parent_id: str) -> bool:
        if not self.service:
            return True
        try:
            kwargs = {
                'fileId': provider_file_id,
                'addParents': new_parent_id,
                'fields': 'id, parents',
            }
            if previous_parent_id:
                kwargs['removeParents'] = previous_parent_id
            self.service.files().update(**kwargs).execute()
            return True
        except HttpError as e:
            self._handle_http_error(e, f"drive.files.update(fileId='{provider_file_id}')")
            return False
        except Exception as e:
            logger.error(f"Non-HTTP Error in move_object: {str(e)}")
            return False

    def copy_file(self, provider_file_id: str, new_name: str, parent_id: str = None) -> Dict[str, Any]:
        if not self.service:
            import uuid
            return {
                'provider_file_id': f"mock_copy_{uuid.uuid4().hex[:8]}",
                'size': 100,
                'web_view_link': f"https://drive.google.com/mock/{uuid.uuid4().hex}"
            }
        try:
            body = {'name': new_name}
            if parent_id:
                body['parents'] = [parent_id]
            copied = self.service.files().copy(
                fileId=provider_file_id,
                body=body,
                fields='id, size, webViewLink'
            ).execute()
            return {
                'provider_file_id': copied.get('id'),
                'size': int(copied.get('size', 0)),
                'web_view_link': copied.get('webViewLink')
            }
        except HttpError as e:
            self._handle_http_error(e, f"drive.files.copy(fileId='{provider_file_id}')")
            raise
        except Exception as e:
            logger.error(f"Non-HTTP Error in copy_file: {str(e)}")
            raise
