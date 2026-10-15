from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import SESSION_COOKIE_NAME, get_current_user
from app.core.config import settings
from app.core.security import generate_csrf_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    CSRFResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_session_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=settings.SESSION_EXPIRY_SECONDS,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN or None,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    user, raw_token = await service.register(req)
    _set_session_cookie(response, raw_token)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    user_agent = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None
    service = AuthService(db)
    user, raw_token = await service.login(req, user_agent=user_agent, ip_coarse=client_ip)
    _set_session_cookie(response, raw_token)
    return UserResponse.model_validate(user)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    response: Response,
    conflux_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    if conflux_session:
        service = AuthService(db)
        await service.logout(conflux_session)
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    # Generic response returned to protect against user enumeration
    await service.forgot_password(req.email)
    return {"message": "If this email is registered, password reset instructions have been dispatched."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    await service.reset_password(req.token, req.new_password)
    return {"message": "Password reset successfully. Please sign in with your new password."}


@router.get("/csrf", response_model=CSRFResponse)
async def get_csrf_token(
    current_user: User = Depends(get_current_user)
):
    token = generate_csrf_token(current_user.id)
    return CSRFResponse(csrf_token=token)
