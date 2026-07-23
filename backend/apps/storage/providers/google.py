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
            f"Google Drive API Request Failed!\n"
            f"Endpoint: {endpoint}\n"
            f"HTTP Status: {status_code}\n"
            f"Error details: {content}"
        )
        # Output directly to stdout/stderr for easy debugging
        print(f"--- GOOGLE API ERROR ---")
        print(f"Endpoint: {endpoint}")
        print(f"HTTP Status: {status_code}")
        print(f"Response: {content}")
        print(f"------------------------")
        raise e

    def get_quota(self) -> Tuple[int, int]:
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

    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str) -> Dict[str, Any]:
        endpoint = "drive.files.create"
        try:
            file_metadata = {'name': filename}
            media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
            
            logger.info(f"Executing API request: drive.files.create(name='{filename}', mime='{mime_type}')")
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
