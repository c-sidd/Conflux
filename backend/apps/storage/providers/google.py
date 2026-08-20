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
        from django.core.exceptions import ImproperlyConfigured
        mock_enabled = getattr(settings, 'MOCK_GOOGLE_DRIVE', settings.DEBUG)
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            if not mock_enabled:
                raise ImproperlyConfigured("Google Drive credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are missing or empty in production!")
            logger.info("Google Drive credentials missing. GoogleDriveProvider running in MOCK mode (development only).")
            self.service = None
            return
        self.credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET
        )
        self.service = build('drive', 'v3', credentials=self.credentials)

    def _handle_http_error(self, e: HttpError, endpoint: str):
        status_code = e.resp.status
        content = e.content.decode('utf-8') if e.content else ""
        logger.error(
            f"Google Drive API Request Failed! "
            f"Endpoint: {endpoint} | HTTP Status: {status_code} | Error: {content}"
        )
        raise e

    def get_quota(self) -> Tuple[int, int]:
        if not self.service:
            return 15 * 1024 * 1024 * 1024, 1024 * 1024
        endpoint = "drive.about.get"
        try:
            logger.info("Executing API request: drive.about.get(fields='storageQuota')")
            about = self.service.about().get(fields="storageQuota").execute()
            logger.info(f"API Response from drive.about.get: {about}")
            
            quota = about.get('storageQuota', {})
            total = int(quota.get('limit', 0))
            used = int(quota.get('usage', 0))
            return total, used
        except HttpError as e:
            self._handle_http_error(e, endpoint)
        except Exception as e:
            logger.error(f"Non-HTTP Error in get_quota: {str(e)}")
            raise e

    def get_or_create_folder(self, folder_name: str, parent_id: str = None) -> str:
        if not self.service:
            import uuid
            return f"mock_folder_{uuid.uuid4().hex[:8]}"
        endpoint = "drive.files.list/create"
        try:
            q = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            if parent_id:
                q += f" and '{parent_id}' in parents"
            
            results = self.service.files().list(
                q=q,
                fields="files(id, name)",
                pageSize=1
            ).execute()
            files = results.get('files', [])
            
            if files:
                return files[0]['id']
            
            # Create folder
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
            self._handle_http_error(e, endpoint)
        except Exception as e:
            logger.error(f"Error in get_or_create_folder: {str(e)}")
            raise e

    def get_or_create_workspace_root(self) -> str:
        from apps.common.branding import WORKSPACE_FOLDER_NAME
        return self.get_or_create_folder(WORKSPACE_FOLDER_NAME)

    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str, parent_id: str = None) -> Dict[str, Any]:
        if not self.service:
            import uuid
            # Read input file to get its size
            file_obj.seek(0, io.SEEK_END)
            file_size = file_obj.tell()
            file_obj.seek(0)
            return {
                'provider_file_id': f"mock_file_{uuid.uuid4().hex[:8]}",
                'size': file_size,
                'web_view_link': f"https://drive.google.com/mock/{uuid.uuid4().hex}"
            }
        endpoint = "drive.files.create"
        try:
            file_metadata = {'name': filename}
            if parent_id:
                file_metadata['parents'] = [parent_id]

            media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
            
            logger.info(f"Executing API request: drive.files.create(name='{filename}', mime='{mime_type}', parent='{parent_id}')")
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, size, webViewLink'
            ).execute()
            logger.info(f"API Response from drive.files.create: {file}")
            
            return {
                'provider_file_id': file.get('id'),
                'size': int(file.get('size', 0)),
                'web_view_link': file.get('webViewLink')
            }
        except HttpError as e:
            self._handle_http_error(e, endpoint)
        except Exception as e:
            logger.error(f"Non-HTTP Error in upload_file: {str(e)}")
            raise e


    def download_file(self, provider_file_id: str) -> BinaryIO:
        if not self.service:
            return io.BytesIO(b"Simulated Google Drive file contents from Conflux mock provider.")
        endpoint = f"drive.files.get_media(fileId='{provider_file_id}')"
        try:
            logger.info(f"Executing API request: drive.files.get_media for fileId: {provider_file_id}")
            request = self.service.files().get_media(fileId=provider_file_id)
            file_obj = io.BytesIO()
            downloader = MediaIoBaseDownload(file_obj, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
            file_obj.seek(0)
            logger.info("Download completed successfully")
            return file_obj
        except HttpError as e:
            self._handle_http_error(e, endpoint)
        except Exception as e:
            logger.error(f"Non-HTTP Error in download_file: {str(e)}")
            raise e

    def delete_file(self, provider_file_id: str) -> bool:
        if not self.service:
            return True
        endpoint = f"drive.files.delete(fileId='{provider_file_id}')"
        try:
            logger.info(f"Executing API request: drive.files.delete for fileId: {provider_file_id}")
            self.service.files().delete(fileId=provider_file_id).execute()
            logger.info("Delete completed successfully")
            return True
        except HttpError as e:
            try:
                self._handle_http_error(e, endpoint)
            except Exception:
                pass
            return False
        except Exception as e:
            logger.error(f"Non-HTTP Error in delete_file: {str(e)}")
            return False

    def rename_object(self, provider_file_id: str, new_name: str) -> bool:
        if not self.service:
            return True
        endpoint = f"drive.files.update(fileId='{provider_file_id}', name='{new_name}')"
        try:
            logger.info(f"Executing API request: {endpoint}")
            self.service.files().update(
                fileId=provider_file_id,
                body={'name': new_name}
            ).execute()
            logger.info("Rename completed successfully")
            return True
        except HttpError as e:
            self._handle_http_error(e, endpoint)
            return False
        except Exception as e:
            logger.error(f"Non-HTTP Error in rename_object: {str(e)}")
            return False

    def move_object(self, provider_file_id: str, previous_parent_id: str, new_parent_id: str) -> bool:
        if not self.service:
            return True
        try:
            # If previous_parent_id is not provided, fetch the file's current parents to remove them
            if not previous_parent_id:
                file_info = self.service.files().get(fileId=provider_file_id, fields='parents').execute()
                parents = file_info.get('parents', [])
                # Exclude the target parent if it's already in the parents list to avoid redundancy
                parents = [p for p in parents if p != new_parent_id]
                if parents:
                    previous_parent_id = ','.join(parents)

            endpoint = f"drive.files.update(fileId='{provider_file_id}', addParents='{new_parent_id}', removeParents='{previous_parent_id}')"
            logger.info(f"Executing API request: {endpoint}")
            
            kwargs = {
                'fileId': provider_file_id,
                'addParents': new_parent_id,
                'fields': 'id, parents'
            }
            if previous_parent_id:
                kwargs['removeParents'] = previous_parent_id

            self.service.files().update(**kwargs).execute()
            logger.info("Move completed successfully")
            return True
        except HttpError as e:
            self._handle_http_error(e, endpoint)
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
        endpoint = f"drive.files.copy(fileId='{provider_file_id}')"
        try:
            logger.info(f"Executing API request: drive.files.copy for fileId: {provider_file_id}")
            body = {'name': new_name}
            if parent_id:
                body['parents'] = [parent_id]
            copied = self.service.files().copy(
                fileId=provider_file_id,
                body=body,
                fields='id, size, webViewLink'
            ).execute()
            logger.info("Copy completed successfully")
            return {
                'provider_file_id': copied.get('id'),
                'size': int(copied.get('size', 0)),
                'web_view_link': copied.get('webViewLink')
            }
        except HttpError as e:
            self._handle_http_error(e, endpoint)
            raise e
        except Exception as e:
            logger.error(f"Non-HTTP Error in copy_file: {str(e)}")
            raise e

