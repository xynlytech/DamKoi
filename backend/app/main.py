"""
DamKoi — FastAPI Main Application

The central entry point for the DamKoi backend API.
All routes, middleware, and lifecycle hooks are configured here.
"""

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.config import settings
from app.routers import products, alerts, tracking, auth, compare, admin, coupons, payments, ai, telemetry

# ── Sentry Error Monitoring (Free: 5K events/month) ──────────

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1 if settings.is_production else 1.0,
        environment=settings.APP_ENV,
    )


# ── App Lifecycle ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("DamKoi API starting...")
    print(f"   Environment: {settings.APP_ENV}")
    print(f"   Debug: {settings.APP_DEBUG}")

    # Log enabled platforms + set Sentry tag
    from app.services.flags import get_enabled_platform_names
    enabled = sorted(get_enabled_platform_names())
    print(f"   Enabled platforms: {', '.join(enabled)}")
    if settings.SENTRY_DSN:
        sentry_sdk.set_tag("enabled_platforms", ",".join(enabled))

    # Start the scraper/alert/coupon/deals scheduler
    from app.scraper.tasks import setup_scheduler, scheduler
    setup_scheduler()
    print("   Scheduler: all jobs registered and running.")

    yield

    # Shutdown
    print("DamKoi API shutting down...")
    scheduler.shutdown(wait=False)
    print("   Scheduler stopped.")




# ── FastAPI App ───────────────────────────────────────────────

app = FastAPI(
    title="DamKoi API",
    description=(
        "Bangladesh Shopping Intelligence Platform — "
        "Price history, fake discount detection, and deal scores for Daraz products."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_DEBUG else None,
    redoc_url="/redoc" if settings.APP_DEBUG else None,
)

# Rate limiter
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow extension and frontend origins
# Origins are configured via CORS_ORIGINS env var (JSON list).
# ALLOWED_EXTENSION_ID auto-adds the chrome-extension:// origin.
# In development: only localhost. In production: your domain + extension.
_allow_creds = not settings.is_production or bool(settings.ALLOWED_EXTENSION_ID)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=_allow_creds,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Extension-ID", "X-Request-ID"],
)


# ── Routes ────────────────────────────────────────────────────

app.include_router(products.router, prefix="/v1")
app.include_router(ai.router, prefix="/v1/products")
app.include_router(alerts.router, prefix="/v1")
app.include_router(tracking.router, prefix="/v1")
app.include_router(auth.router, prefix="/v1")
app.include_router(compare.router, prefix="/v1")
app.include_router(coupons.router, prefix="/v1/coupons")
app.include_router(payments.router, prefix="/v1/payments")
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(telemetry.router, prefix="/v1")


# ── Health Check ──────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "damkoi-api",
        "version": "1.0.0",
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint — API info."""
    return {
        "name": "DamKoi API",
        "version": "1.0.0",
        "description": "Bangladesh Shopping Intelligence Platform",
        "docs": f"{settings.API_BASE_URL}/docs",
    }


# ── Global Error Handler ─────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler to prevent unhandled exceptions from leaking."""
    if settings.APP_DEBUG:
        raise exc

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": "Something went wrong. Please try again.",
        },
    )
