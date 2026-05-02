"""
DamKoi — Application Configuration

Loads settings from environment variables with sensible defaults.
All free-tier service configurations are handled here.
"""

from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    # ── Production ─────────────────────────────────────────
    # Set ALLOWED_EXTENSION_ID to your published Chrome extension's stable ID
    # (found in chrome://extensions after publishing) to auto-add it to CORS
    ALLOWED_EXTENSION_ID: str = ""
    # Your production domain, e.g. "https://api.damkoi.com"
    PRODUCTION_DOMAIN: str = ""

    # ── Database (Supabase PostgreSQL — Free: 500MB) ──────
    DATABASE_URL: str = ""
    DATABASE_URL_SYNC: str = ""

    # ── Redis (Upstash — Free: 10K commands/day) ──────────
    REDIS_URL: str = ""

    # ── Supabase Auth (Free: 50K MAU) ─────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # ── Email: Resend (Free: 100 emails/day) ──────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "alerts@damkoi.com"

    # ── Sentry (Free: 5K events/month) ────────────────────
    SENTRY_DSN: str = ""

    # ── Telegram Bot (Free: Unlimited) ────────────────────
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # ── Rate Limiting ─────────────────────────────────────
    RATE_LIMIT_ANONYMOUS: str = "30/minute"
    RATE_LIMIT_AUTHENTICATED: str = "120/minute"
    RATE_LIMIT_EXTENSION: str = "60/minute"

    # ── Scraper Config ────────────────────────────────────
    SCRAPE_DELAY_MIN: float = 2.0  # seconds
    SCRAPE_DELAY_MAX: float = 5.0  # seconds
    SCRAPE_MAX_RETRIES: int = 3
    SCRAPE_RETRY_DELAY: int = 1800  # 30 minutes

    @property
    def cors_origins_list(self) -> List[str]:
        """
        Parse CORS origins from JSON string, then automatically append:
        - chrome-extension://{ALLOWED_EXTENSION_ID} (if set)
        - PRODUCTION_DOMAIN (if set and not already included)
        """
        try:
            origins = json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            origins = ["http://localhost:3000"]

        # Auto-include the published Chrome extension origin
        if self.ALLOWED_EXTENSION_ID:
            ext_origin = f"chrome-extension://{self.ALLOWED_EXTENSION_ID}"
            if ext_origin not in origins:
                origins.append(ext_origin)

        # Auto-include the production domain
        if self.PRODUCTION_DOMAIN and self.PRODUCTION_DOMAIN not in origins:
            origins.append(self.PRODUCTION_DOMAIN)
            
        # In development, we can be more permissive with extension origins if needed
        # but Starlette CORSMiddleware requires exact matches for credentials=True.
        # The ALLOWED_EXTENSION_ID logic above handles the most common case.

        return origins

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance
settings = Settings()
