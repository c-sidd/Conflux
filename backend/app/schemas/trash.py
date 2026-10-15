from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TrashItemResponse(BaseModel):
    id: str
    connected_account_id: str
    source_account_email: Optional[str] = None
    provider_file_id: str
    name: str
    mime_type: str
    size_bytes: Optional[int] = None
    trashed_at: Optional[datetime] = None
    recoverable: bool = True
    recovery_status: str = "RECOVERABLE"  # RECOVERABLE, EXTERNALLY_DELETED, RESTRICTED
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
