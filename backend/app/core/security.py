import hashlib
import hmac
import secrets
from typing import Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.core.config import settings

ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def generate_session_token() -> Tuple[str, str]:
    """
    Generates a secure random session secret to send to the client cookie,
    and returns (raw_token, token_hash) to store only the hash in PostgreSQL.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_session_token(raw_token)
    return raw_token, token_hash


def hash_session_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_csrf_token(session_id: str) -> str:
    """
    Generates an HMAC-based CSRF token tied to the user's session ID.
    """
    signature = hmac.new(
        settings.CSRF_SECRET.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{session_id}.{signature}"


def verify_csrf_token(csrf_token: str, expected_session_id: str) -> bool:
    if not csrf_token or "." not in csrf_token:
        return False
    session_id, signature = csrf_token.split(".", 1)
    if session_id != expected_session_id:
        return False
    expected_signature = hmac.new(
        settings.CSRF_SECRET.encode("utf-8"),
        expected_session_id.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)


def generate_password_reset_token() -> Tuple[str, str]:
    """Returns (raw_token, token_hash)."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash
