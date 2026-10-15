from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CreateUploadRequest(BaseModel):
    name: str = Field(min_length=1, max_length=512)
    mime_type: str = "application/octet-stream"
    size_bytes: int = Field(ge=0)
    destination_account_id: Optional[str] = None  # None = Automatic Best-Fit placement
    parent_file_id: Optional[str] = None


class UploadResponse(BaseModel):
    operation_id: str
    status: str
    destination_account_id: str
    destination_account_email: Optional[str] = None
    placement_type: str  # AUTOMATIC or MANUAL
    placement_reason: str
    upload_url: Optional[str] = None


class CompleteUploadRequest(BaseModel):
    provider_file_id: Optional[str] = None


class FileOperationResponse(BaseModel):
    id: str
    operation_type: str
    status: str
    source_account_id: Optional[str] = None
    destination_account_id: Optional[str] = None
    source_file_id: Optional[str] = None
    destination_file_id: Optional[str] = None
    progress_current: Optional[int] = 0
    progress_total: Optional[int] = 0
    progress_percentage: Optional[float] = 0.0
    safe_error_code: Optional[str] = None
    safe_error_message: Optional[str] = None
    retryable: bool = True
    confirmation_requested_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    finished_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConfirmSourceRemovalRequest(BaseModel):
    confirmed: bool = True
