from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    security_question: Optional[str] = Field(default=None, max_length=255)
    security_answer: Optional[str] = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class SecurityQuestionRequest(BaseModel):
    email: EmailStr


class SecurityQuestionResponse(BaseModel):
    email: str
    security_question: str


class ResetPasswordWithQuestionRequest(BaseModel):
    email: EmailStr
    security_answer: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=8, max_length=128)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    status: str
    email_verified_at: Optional[datetime] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None


class CSRFResponse(BaseModel):
    csrf_token: str
