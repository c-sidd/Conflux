from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class QuotaSnapshot(BaseModel):
    quota_total_bytes: Optional[int] = None
    quota_used_bytes: Optional[int] = None
    quota_observed_at: Optional[datetime] = None
    quota_source: Optional[str] = None


class ConnectedAccountResponse(BaseModel):
    id: str
    provider: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    connection_status: str
    last_successful_sync_at: Optional[datetime] = None
    last_sync_attempt_at: Optional[datetime] = None
    last_error_code: Optional[str] = None
    quota: QuotaSnapshot
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoogleAuthorizeResponse(BaseModel):
    authorization_url: str
    state: str


class SyncAccountResponse(BaseModel):
    operation_id: str
    status: str
    message: str
