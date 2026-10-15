from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FileCapabilities(BaseModel):
    can_trash: bool = True
    can_restore: bool = True
    can_delete: bool = True
    can_rename: bool = True
    can_move: bool = True
    can_copy: bool = True
    can_share: bool = True
    can_download: bool = True
    can_export: bool = False


class FileMetadataResponse(BaseModel):
    id: str
    connected_account_id: str
    source_account_email: Optional[str] = None
    provider: str = "GOOGLE_DRIVE"
    provider_file_id: str
    name: str
    mime_type: str
    description: Optional[str] = None
    parent_provider_file_id: Optional[str] = None
    size_bytes: Optional[int] = None
    modified_time_provider: Optional[datetime] = None
    created_time_provider: Optional[datetime] = None
    web_view_link: Optional[str] = None
    trashed_provider: bool = False
    is_folder: bool = False
    is_shortcut: bool = False
    is_starred: bool = False
    capabilities: FileCapabilities = Field(default_factory=FileCapabilities)
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FilePatchRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=512)
    description: Optional[str] = None


class CopyMoveRequest(BaseModel):
    destination_account_id: Optional[str] = None
    destination_parent_file_id: Optional[str] = None


class ToggleStarRequest(BaseModel):
    is_starred: bool


class BatchDownloadRequest(BaseModel):
    file_ids: List[str] = Field(..., min_length=1, max_length=100)

