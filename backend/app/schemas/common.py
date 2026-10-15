from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str
    details: Optional[Any] = None


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    next_page_token: Optional[str] = None
    total_count: Optional[int] = None
