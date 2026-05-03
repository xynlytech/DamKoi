"""
DamKoi — Telemetry Router

Logs coupon auto-apply attempts (success/failure) from the Chrome extension.
Data feeds into the daily Telegram digest and future analytics.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.coupon_application import CouponApplication

router = APIRouter()


class CouponLogRequest(BaseModel):
    platform: str
    coupon_code: Optional[str] = None
    cart_total: Optional[int] = None   # paisa
    savings: Optional[int] = None      # paisa
    success: bool
    user_id: Optional[UUID] = None
    anon_id: Optional[str] = None


@router.post("/telemetry/coupon", tags=["Telemetry"], status_code=204)
async def log_coupon_application(
    payload: CouponLogRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Records a single coupon auto-apply attempt from the Chrome extension.
    Called for every attempt regardless of outcome.
    """
    row = CouponApplication(
        user_id=payload.user_id,
        anon_id=payload.anon_id,
        platform=payload.platform,
        coupon_code=payload.coupon_code,
        cart_total=payload.cart_total,
        savings=payload.savings,
        success=payload.success,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
