from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.errors import AuthRequiredException, ConflictException, ResourceNotFoundException
from app.core.security import (
    generate_password_reset_token,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(self, req: RegisterRequest) -> Tuple[User, str]:
        existing = await self.repo.get_by_email(req.email)
        if existing:
            raise ConflictException("An account with this email already exists")

        pw_hash = hash_password(req.password)
        user = await self.repo.create_user(email=req.email, password_hash=pw_hash)

        # Create session immediately upon registration
        raw_token, token_hash = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_EXPIRY_SECONDS)
        await self.repo.create_session(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        return user, raw_token

    async def login(
        self,
        req: LoginRequest,
        user_agent: Optional[str] = None,
        ip_coarse: Optional[str] = None
    ) -> Tuple[User, str]:
        user = await self.repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise AuthRequiredException("Invalid email or password")

        if user.status != "active":
            raise AuthRequiredException("Account is disabled or inactive")

        await self.repo.update_last_login(user.id)
        raw_token, token_hash = generate_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_EXPIRY_SECONDS)
        await self.repo.create_session(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_coarse=ip_coarse
        )
        return user, raw_token

    async def logout(self, raw_session_token: str) -> None:
        if raw_session_token:
            token_hash = hash_session_token(raw_session_token)
            await self.repo.revoke_session(token_hash)

    async def authenticate_session(self, raw_session_token: str) -> User:
        if not raw_session_token:
            raise AuthRequiredException("No session token provided")

        token_hash = hash_session_token(raw_session_token)
        session = await self.repo.get_session_by_token_hash(token_hash)
        if not session:
            raise AuthRequiredException("Session invalid or expired")

        user = await self.repo.get_by_id(session.user_id)
        if not user or user.status != "active":
            raise AuthRequiredException("User not found or disabled")

        # Touch session activity
        await self.repo.touch_session(session.id)
        return user

    async def forgot_password(self, email: str) -> Optional[str]:
        """
        Generates single-use reset token. Returns raw token for email sending.
        Generic response protects against account enumeration.
        """
        user = await self.repo.get_by_email(email)
        if not user:
            return None
        raw_token, token_hash = generate_password_reset_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await self.repo.create_reset_token(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        return raw_token

    async def reset_password(self, token: str, new_password: str) -> None:
        token_hash = hash_session_token(token)
        reset_token = await self.repo.get_valid_reset_token(token_hash)
        if not reset_token:
            raise AuthRequiredException("Password reset link is invalid or expired")

        new_hash = hash_password(new_password)
        await self.repo.update_password(reset_token.user_id, new_hash)
        await self.repo.mark_reset_token_used(reset_token.id)
        # Invalidate all active sessions for security
        await self.repo.revoke_all_user_sessions(reset_token.user_id)
