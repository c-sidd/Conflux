from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional


class BaseStorageProvider(ABC):
    @abstractmethod
    async def get_about(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Returns account identity, quota, and root folder ID."""
        pass

    @abstractmethod
    async def list_files(
        self,
        credentials: Dict[str, Any],
        folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        page_size: int = 100,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """Lists files or children with next_page_token."""
        pass

    @abstractmethod
    async def get_file_metadata(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        """Fetches normalized metadata for a file."""
        pass

    @abstractmethod
    async def upload_file(
        self,
        credentials: Dict[str, Any],
        name: str,
        content: bytes,
        mime_type: str,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Uploads a file and returns created metadata."""
        pass

    @abstractmethod
    async def download_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> AsyncGenerator[bytes, None]:
        """Streams binary content."""
        pass

    @abstractmethod
    async def export_document(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        mime_type: str
    ) -> bytes:
        """Exports a Google-native document to a supported format (e.g. PDF, DOCX, XLSX)."""
        pass

    @abstractmethod
    async def rename_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        new_name: str
    ) -> Dict[str, Any]:
        """Renames a file."""
        pass

    @abstractmethod
    async def move_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        new_parent_id: str,
        old_parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Moves file to a new parent folder in the same account."""
        pass

    @abstractmethod
    async def copy_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        destination_parent_id: Optional[str] = None,
        new_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a copy of the file."""
        pass

    @abstractmethod
    async def trash_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        """Moves file to provider trash."""
        pass

    @abstractmethod
    async def restore_file(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> Dict[str, Any]:
        """Restores file from provider trash."""
        pass

    @abstractmethod
    async def delete_permanently(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> bool:
        """Permanently deletes a file from the provider."""
        pass

    @abstractmethod
    async def get_changes(
        self,
        credentials: Dict[str, Any],
        saved_page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetches incremental changes and returns new page token."""
        pass

    @abstractmethod
    async def list_permissions(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str
    ) -> List[Dict[str, Any]]:
        """Lists permissions for a file."""
        pass

    @abstractmethod
    async def create_permission(
        self,
        credentials: Dict[str, Any],
        provider_file_id: str,
        role: str,
        perm_type: str,
        email_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a permission on the file."""
        pass
