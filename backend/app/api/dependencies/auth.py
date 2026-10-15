from typing import Optional
from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import AuthRequiredException, ConfluxException
from app.core.security import verify_csrf_token
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService

SESSION_COOKIE_NAME = "conflux_session"
CSRF_COOKIE_NAME = "conflux_csrf"


async def get_current_user(
    request: Request,
    conflux_session: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = None
    is_cookie_auth = False

    if conflux_session:
        token = conflux_session
        is_cookie_auth = True
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if not token:
        raise AuthRequiredException("Authentication required. Please sign in.")

    auth_service = AuthService(db)
    user, session = await auth_service.authenticate_session_with_details(token)
    request.state.current_user = user
    request.state.session_id = session.id

    # Enforce CSRF protection for cookie-authenticated mutating requests
    if is_cookie_auth and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        exempt_paths = (
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/logout",
            "/api/v1/auth/security-question",
            "/api/v1/auth/reset-password-question",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
            "/api/v1/accounts/google/callback",
        )
        if not any(request.url.path.startswith(p) for p in exempt_paths):
            csrf_token = (
                request.headers.get("X-CSRF-Token")
                or request.headers.get("x-csrf-token")
                or request.cookies.get(CSRF_COOKIE_NAME)
            )
            if not csrf_token or not verify_csrf_token(csrf_token, session.id):
                raise ConfluxException("CSRF_TOKEN_INVALID", "Invalid or missing CSRF security token", status_code=403)

    return user
