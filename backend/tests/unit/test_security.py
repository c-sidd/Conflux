import pytest
from app.core.security import (
    generate_csrf_token,
    generate_password_reset_token,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_csrf_token,
    verify_password,
)


def test_password_hashing():
    pw = "SuperSecretPassword123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_session_token_generation():
    raw_token, token_hash = generate_session_token()
    assert len(raw_token) > 30
    assert len(token_hash) == 64  # SHA-256 hex digest
    assert hash_session_token(raw_token) == token_hash


def test_csrf_token_validation():
    session_id = "sess-12345"
    token = generate_csrf_token(session_id)
    assert verify_csrf_token(token, session_id) is True
    assert verify_csrf_token(token, "different-session") is False
    assert verify_csrf_token("malformed.token", session_id) is False


def test_password_reset_token():
    raw, hashed = generate_password_reset_token()
    assert len(raw) > 20
    assert len(hashed) == 64
