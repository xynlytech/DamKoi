"""
DamKoi — Database Connection

Async SQLAlchemy engine connected to Supabase PostgreSQL (free tier).
Uses connection pooling to stay within the 60 connection limit.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


def _async_db_url(url: str) -> str:
    """Normalize managed Postgres URLs to postgresql+asyncpg://.
    Falls back to local SQLite when DATABASE_URL is not set (dev/CI only)."""
    if not url:
        return "sqlite+aiosqlite:///./damkoi_local.db"
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


_db_url = _async_db_url(settings.DATABASE_URL)
_is_sqlite = _db_url.startswith("sqlite")

# Async engine — uses asyncpg for PostgreSQL, aiosqlite for local dev
engine = create_async_engine(
    _db_url,
    echo=settings.APP_DEBUG,
    # SQLite doesn't support pool_size / max_overflow
    **({} if _is_sqlite else {"pool_size": 5, "max_overflow": 10, "pool_pre_ping": True}),
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
