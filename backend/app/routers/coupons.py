"""
DamKoi — Coupons Router

Serves active coupons to the DamKoi extension for the Auto-Apply feature.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.coupon import Coupon

router = APIRouter()


from fastapi import Query as FastAPIQuery


class CouponResponse(BaseModel):
    id: str
    code: str
    discount_pct: Optional[int]
    discount_flat: Optional[int]
    min_spend: Optional[int]
    display_discount: str
    payment_method: Optional[str] = None


@router.get("", response_model=List[CouponResponse], tags=["Coupons"])
@router.get("/{platform}", response_model=List[CouponResponse], tags=["Coupons"])
async def get_active_coupons(
    platform: Optional[str] = None,
    payment_method: Optional[str] = FastAPIQuery(None, description="Filter by payment method: 'bkash', 'nagad', etc."),
    cart_total: Optional[int] = FastAPIQuery(None, description="Cart total in paisa — filters out coupons with higher min_spend"),
    db: AsyncSession = Depends(get_db),
):
    """
    Active platform-wide coupons for the extension auto-apply feature.
    Supports optional payment_method filter for bKash/Nagad-specific codes.
    """
    now = datetime.now(timezone.utc)

    filters = [
        Coupon.is_active == True,
        Coupon.product_id.is_(None),
        or_(Coupon.expires_at.is_(None), Coupon.expires_at > now),
    ]

    if cart_total is not None:
        filters.append(or_(Coupon.min_spend.is_(None), Coupon.min_spend <= cart_total))

    # payment_method filter: keep codes with no restriction OR matching the requested method
    if payment_method:
        pm = payment_method.strip().lower()
        filters.append(or_(Coupon.payment_method.is_(None), Coupon.payment_method == pm))

    result = await db.execute(
        select(Coupon)
        .where(and_(*filters))
        .order_by(Coupon.discount_pct.desc().nulls_last(), Coupon.discount_flat.desc().nulls_last())
    )

    coupons = result.scalars().all()

    return [
        CouponResponse(
            id=str(c.id),
            code=c.code,
            discount_pct=c.discount_pct,
            discount_flat=c.discount_flat,
            min_spend=c.min_spend,
            display_discount=c.display_discount,
            payment_method=c.payment_method,
        )
        for c in coupons
    ]
