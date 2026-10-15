import json
from typing import List, Union
from pydantic import field_validator, model_validator
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
    MAX_UPLOAD_SIZE_BYTES: int = 100 * 1024 * 1024  # Direct buffer capped at 100 MB for safety
    UPLOAD_CHUNK_SIZE_BYTES: int = 5 * 1024 * 1024   # 5 MB
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

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        if self.APP_ENV == "production":
            if self.USE_FAKE_STORAGE_PROVIDER:
                raise ValueError("USE_FAKE_STORAGE_PROVIDER cannot be True in production environment.")
            if "insecure" in self.SESSION_SECRET or "development" in self.SESSION_SECRET:
                raise ValueError("Insecure SESSION_SECRET cannot be used in production.")
            if "insecure" in self.CSRF_SECRET or "development" in self.CSRF_SECRET:
                raise ValueError("Insecure CSRF_SECRET cannot be used in production.")
            if "test_key" in self.TOKEN_ENCRYPTION_KEY:
                raise ValueError("Default TOKEN_ENCRYPTION_KEY cannot be used in production.")
            if not self.GOOGLE_CLIENT_ID or not self.GOOGLE_CLIENT_SECRET:
                raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in production.")
        return self


settings = Settings()
