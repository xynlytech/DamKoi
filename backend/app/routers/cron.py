"""
DamKoi — Cron API

Authenticated HTTP entry points for jobs that can safely run in a
serverless environment. Browser-based scraper batches still need a
Playwright-capable worker/runtime.
"""

from typing import Awaitable, Callable, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.config import settings

router = APIRouter(prefix="/cron", tags=["Cron"])


async def verify_cron_secret(
    authorization: Optional[str] = Header(default=None),
    x_cron_secret: Optional[str] = Header(default=None),
) -> None:
    expected = settings.CRON_SECRET
    if not expected:
        if settings.is_production:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CRON_SECRET is not configured.",
            )
        return

    bearer = f"Bearer {expected}"
    if authorization == bearer or x_cron_secret == expected:
        return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing cron secret.",
    )


async def _run_job(name: str, job: Callable[[], Awaitable[None]]) -> Dict[str, str]:
    await job()
    return {"status": "ok", "job": name}


@router.api_route("/alerts", methods=["GET", "POST"], dependencies=[Depends(verify_cron_secret)])
async def run_alert_checks():
    from app.scraper.tasks import check_all_alerts

    return await _run_job("check_all_alerts", check_all_alerts)


@router.api_route("/coupons", methods=["GET", "POST"], dependencies=[Depends(verify_cron_secret)])
async def run_coupon_refresh():
    from app.scraper.tasks import refresh_platform_coupons

    return await _run_job("refresh_platform_coupons", refresh_platform_coupons)


@router.api_route("/daily-digest", methods=["GET", "POST"], dependencies=[Depends(verify_cron_secret)])
async def run_daily_digest():
    from app.scraper.tasks import send_daily_digest_job

    return await _run_job("send_daily_digest_job", send_daily_digest_job)


@router.api_route("/matching", methods=["GET", "POST"], dependencies=[Depends(verify_cron_secret)])
async def run_matching():
    from app.scraper.tasks import run_matching_engine_job

    return await _run_job("run_matching_engine_job", run_matching_engine_job)


@router.api_route("/backfill", methods=["GET", "POST"], dependencies=[Depends(verify_cron_secret)])
async def run_backfill():
    from app.scraper.tasks import run_continuous_backfill

    async def job() -> None:
        await run_continuous_backfill(batch_size=10)

    return await _run_job("run_continuous_backfill", job)


@router.api_route("/cleanup", methods=["GET", "POST"], dependencies=[Depends(verify_cron_secret)])
async def run_cleanup():
    from app.scraper.tasks import cleanup_snapshots

    return await _run_job("cleanup_snapshots", cleanup_snapshots)
