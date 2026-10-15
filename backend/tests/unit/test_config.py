import base64
import secrets
import pytest
from app.core.config import Settings


def test_valid_production_configuration():
    valid_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    cfg = Settings(
        APP_ENV="production",
        USE_FAKE_STORAGE_PROVIDER=False,
        SESSION_SECRET="production_random_session_secret_very_long_64_characters_entropy",
        CSRF_SECRET="production_random_csrf_secret_very_long_64_characters_entropy_here",
        TOKEN_ENCRYPTION_KEY=valid_key,
        GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET="GOCSPX-valid_secret_value",
        DATABASE_URL="postgresql+asyncpg://user:pass@ep-xyz.neon.tech/neondb",
        REDIS_URL="redis://conflux-redis.cache.amazonaws.com:6379/0",
    )
    assert cfg.APP_ENV == "production"
    assert cfg.USE_FAKE_STORAGE_PROVIDER is False
    assert len(base64.urlsafe_b64decode(cfg.TOKEN_ENCRYPTION_KEY)) == 32


def test_production_rejects_fake_storage():
    valid_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    with pytest.raises(ValueError, match="USE_FAKE_STORAGE_PROVIDER cannot be True"):
        Settings(
            APP_ENV="production",
            USE_FAKE_STORAGE_PROVIDER=True,
            TOKEN_ENCRYPTION_KEY=valid_key,
        )


def test_production_rejects_malformed_token_key():
    with pytest.raises(ValueError, match="TOKEN_ENCRYPTION_KEY"):
        Settings(
            APP_ENV="production",
            USE_FAKE_STORAGE_PROVIDER=False,
            SESSION_SECRET="production_random_session_secret_very_long_64_characters_entropy",
            CSRF_SECRET="production_random_csrf_secret_very_long_64_characters_entropy_here",
            TOKEN_ENCRYPTION_KEY="not_a_valid_32_byte_key",
            GOOGLE_CLIENT_ID="client_id",
            GOOGLE_CLIENT_SECRET="client_secret",
            DATABASE_URL="postgresql+asyncpg://user:pass@ep-xyz.neon.tech/neondb",
            REDIS_URL="redis://redis:6379/0",
        )


def test_production_rejects_sqlite_database_url():
    valid_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    with pytest.raises(ValueError, match="Production DATABASE_URL must be a PostgreSQL"):
        Settings(
            APP_ENV="production",
            USE_FAKE_STORAGE_PROVIDER=False,
            SESSION_SECRET="production_random_session_secret_very_long_64_characters_entropy",
            CSRF_SECRET="production_random_csrf_secret_very_long_64_characters_entropy_here",
            TOKEN_ENCRYPTION_KEY=valid_key,
            GOOGLE_CLIENT_ID="client_id",
            GOOGLE_CLIENT_SECRET="client_secret",
            DATABASE_URL="sqlite+aiosqlite:///./test.db",
            REDIS_URL="redis://redis:6379/0",
        )
