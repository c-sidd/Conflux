import io
from typing import BinaryIO, Dict, Any, Tuple
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from django.conf import settings
from .base import StorageProvider

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

    def get_quota(self) -> Tuple[int, int]:
        about = self.service.about().get(fields="storageQuota").execute()
        quota = about.get('storageQuota', {})
        total = int(quota.get('limit', 0))
        used = int(quota.get('usage', 0))
        return total, used

    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str) -> Dict[str, Any]:
        file_metadata = {'name': filename}
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

    def download_file(self, provider_file_id: str) -> BinaryIO:
        request = self.service.files().get_media(fileId=provider_file_id)
        file_obj = io.BytesIO()
        downloader = MediaIoBaseDownload(file_obj, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
        file_obj.seek(0)
        return file_obj

    def delete_file(self, provider_file_id: str) -> bool:
        try:
            self.service.files().delete(fileId=provider_file_id).execute()
            return True
        except Exception:
            return False
