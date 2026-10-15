from typing import Optional
from pydantic import BaseModel, EmailStr


class PermissionResponse(BaseModel):
    id: str
    role: str  # reader, commenter, writer, owner
    type: str  # user, group, domain, anyone
    email_address: Optional[str] = None
    display_name: Optional[str] = None


class CreatePermissionRequest(BaseModel):
    role: str = "reader"
    type: str = "user"
    email_address: Optional[EmailStr] = None


class UpdatePermissionRequest(BaseModel):
    role: str
