from abc import ABC, abstractmethod
from typing import BinaryIO, Dict, Any, Tuple

class StorageProvider(ABC):
    """
    Abstract base class for all storage providers (Google Drive, Dropbox, etc.)
    """

    @abstractmethod
    def get_quota(self) -> Tuple[int, int]:
        """
        Returns (total_bytes, used_bytes) for the storage account.
        """
        pass

    @abstractmethod
    def upload_file(self, file_obj: BinaryIO, filename: str, mime_type: str) -> Dict[str, Any]:
        """
        Uploads a file to the provider.
        Returns a dictionary with at least:
        {
            'provider_file_id': '...',
            'size': 12345,
            'web_view_link': '...'
        }
        """
        pass

    @abstractmethod
    def download_file(self, provider_file_id: str) -> BinaryIO:
        """
        Downloads a file and returns a binary stream.
        """
        pass

    @abstractmethod
    def delete_file(self, provider_file_id: str) -> bool:
        """
        Deletes a file from the provider.
        """
        pass

    @abstractmethod
    def rename_object(self, provider_file_id: str, new_name: str) -> bool:
        """
        Renames a file or folder on the provider.
        """
        pass

    @abstractmethod
    def move_object(self, provider_file_id: str, previous_parent_id: str, new_parent_id: str) -> bool:
        """
        Moves a file or folder on the provider to a new parent folder.
        """
        pass

    @abstractmethod
    def copy_file(self, provider_file_id: str, new_name: str, parent_id: str = None) -> Dict[str, Any]:
        """
        Copies a file on the provider.
        """
        pass

