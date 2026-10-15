from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings


def normalize_async_url(raw_url: str) -> str:
    """Normalizes PostgreSQL URLs (including Neon serverless URLs) for asyncpg."""
    url = (raw_url or "").strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # asyncpg expects ssl=... instead of sslmode=...
    if "asyncpg" in url and "sslmode=" in url:
        url = url.replace("sslmode=", "ssl=")
    return url


def normalize_sync_url(raw_url: str) -> str:
    """Normalizes PostgreSQL URLs (including Neon serverless URLs) for psycopg2 sync engine."""
    url = (raw_url or settings.DATABASE_URL or "").strip()
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # psycopg2 expects sslmode=... instead of ssl=...
    if "psycopg2" in url and "ssl=" in url and "sslmode=" not in url:
        url = url.replace("ssl=", "sslmode=")
    return url


# Async engine for FastAPI
engine_args = {}
db_url = normalize_async_url(settings.DATABASE_URL)

if "sqlite" in db_url:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_pre_ping"] = True
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

async_engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    **engine_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync engine for Alembic / Celery background tasks
sync_engine_args = {}
sync_url = normalize_sync_url(settings.DATABASE_SYNC_URL)

if "sqlite" in sync_url:
    sync_engine_args["connect_args"] = {"check_same_thread": False}
else:
    sync_engine_args["pool_pre_ping"] = True

sync_engine = create_engine(
    sync_url,
    **sync_engine_args,
)

SyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
