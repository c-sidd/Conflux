import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Conflux"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    PUBLIC_APP_URL: str = "http://localhost:5173"
    API_PUBLIC_URL: str = "http://localhost:8000"
    CORS_ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000"
    ]

    DATABASE_URL: str = "sqlite+aiosqlite:///./conflux.db"
    DATABASE_SYNC_URL: str = "sqlite:///./conflux.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & Tokens
    SESSION_SECRET: str = "development_insecure_session_secret_32_characters_long_min"
    CSRF_SECRET: str = "development_insecure_csrf_secret_32_characters_long_minimum"
    # AES-256 Fernet-compatible key (32 URL-safe base64-encoded bytes)
    TOKEN_ENCRYPTION_KEY: str = "dGVzdF9rZXlfZm9yX2RldmVsb3BtZW50X29ubHlfMzJfYnl0ZXM="
    SESSION_EXPIRY_SECONDS: int = 86400 * 7  # 7 days
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/accounts/google/callback"
    GOOGLE_SCOPES: Union[List[str], str] = ["https://www.googleapis.com/auth/drive"]

    # Provider Mode
    USE_FAKE_STORAGE_PROVIDER: bool = True

    # Uploads and files
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024 * 1024  # 10 GB
    UPLOAD_CHUNK_SIZE_BYTES: int = 5 * 1024 * 1024        # 5 MB
    RESERVATION_EXPIRY_MINUTES: int = 60

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("GOOGLE_SCOPES", mode="before")
    @classmethod
    def assemble_google_scopes(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
