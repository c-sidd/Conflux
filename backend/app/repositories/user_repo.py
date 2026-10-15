from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import PasswordResetToken, User, UserSession


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        normalized = email.strip().lower()
        stmt = select(User).where(User.email_normalized == normalized)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_user(
        self,
        email: str,
        password_hash: str,
        security_question: Optional[str] = None,
        security_answer_hash: Optional[str] = None
    ) -> User:
        user = User(
            email_normalized=email.strip().lower(),
            password_hash=password_hash,
            security_question=security_question,
            security_answer_hash=security_answer_hash,
            status="active"
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user_id: str) -> None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(last_login_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def update_password(self, user_id: str, new_password_hash: str) -> None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(
                password_hash=new_password_hash,
                updated_at=datetime.now(timezone.utc)
            )
        )
        await self.db.execute(stmt)
        await self.db.commit()

    # Session methods
    async def create_session(
        self,
        user_id: str,
        token_hash: str,
        expires_at: datetime,
        user_agent: Optional[str] = None,
        ip_coarse: Optional[str] = None
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent_summary=user_agent,
            ip_coarse=ip_coarse,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_session_by_token_hash(self, token_hash: str) -> Optional[UserSession]:
        stmt = (
            select(UserSession)
            .where(
                UserSession.token_hash == token_hash,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def touch_session(self, session_id: str) -> None:
        stmt = (
            update(UserSession)
            .where(UserSession.id == session_id)
            .values(last_seen_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def revoke_session(self, token_hash: str) -> None:
        stmt = (
            update(UserSession)
            .where(UserSession.token_hash == token_hash)
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def revoke_all_user_sessions(self, user_id: str) -> None:
        stmt = (
            update(UserSession)
            .where(UserSession.user_id == user_id)
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)
        await self.db.commit()

    # Password Reset Token methods
    async def create_reset_token(self, user_id: str, token_hash: str, expires_at: datetime) -> PasswordResetToken:
        token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        await self.db.commit()
        await self.db.refresh(token)
        return token

    async def get_valid_reset_token(self, token_hash: str) -> Optional[PasswordResetToken]:
        stmt = (
            select(PasswordResetToken)
            .where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_reset_token_used(self, token_id: str) -> None:
        stmt = (
            update(PasswordResetToken)
            .where(PasswordResetToken.id == token_id)
            .values(used_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)
        await self.db.commit()
