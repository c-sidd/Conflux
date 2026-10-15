from typing import Optional
from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import AuthRequiredException
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService


SESSION_COOKIE_NAME = "conflux_session"


async def get_current_user(
    request: Request,
    conflux_session: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = None
    if conflux_session:
        token = conflux_session
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if not token:
        raise AuthRequiredException("Authentication required. Please sign in.")

    auth_service = AuthService(db)
    user = await auth_service.authenticate_session(token)
    request.state.current_user = user
    return user
