from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies.auth import CSRF_COOKIE_NAME, SESSION_COOKIE_NAME, get_current_user
from app.core.config import settings
from app.core.errors import ResourceNotFoundException
from app.core.security import generate_csrf_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    CSRFResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordWithQuestionRequest,
    SecurityQuestionRequest,
    SecurityQuestionResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_auth_cookies(response: Response, raw_token: str, session_id: Optional[str] = None) -> None:
    # 1. HttpOnly Session Cookie
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

    # 2. CSRF Token Cookie (Readable by JS, used for Double Submit CSRF Header)
    if session_id:
        csrf_token = generate_csrf_token(session_id)
        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=csrf_token,
            max_age=settings.SESSION_EXPIRY_SECONDS,
            httponly=False,
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
    _, session = await service.authenticate_session_with_details(raw_token)
    _set_auth_cookies(response, raw_token, session.id)
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
    _, session = await service.authenticate_session_with_details(raw_token)
    _set_auth_cookies(response, raw_token, session.id)
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
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return UserResponse.model_validate(current_user)


@router.post("/security-question", response_model=SecurityQuestionResponse)
async def get_security_question(
    req: SecurityQuestionRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    question = await service.get_security_question(req.email)
    if not question:
        raise ResourceNotFoundException("No security question configured for this account")
    return SecurityQuestionResponse(email=req.email, security_question=question)


@router.post("/reset-password-question", status_code=status.HTTP_200_OK)
async def reset_password_with_question(
    req: ResetPasswordWithQuestionRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    await service.reset_password_with_question(
        email=req.email,
        security_answer=req.security_answer,
        new_password=req.new_password
    )
    return {"message": "Password reset successfully. Please sign in with your new password."}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
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
    request: Request,
    current_user: User = Depends(get_current_user)
):
    session_id = getattr(request.state, "session_id", current_user.id)
    token = generate_csrf_token(session_id)
    return CSRFResponse(csrf_token=token)
