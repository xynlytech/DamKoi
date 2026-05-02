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


class CouponResponse(BaseModel):
    id: str
    code: str
    discount_pct: Optional[int]
    discount_flat: Optional[int]
    min_spend: Optional[int]
    display_discount: str


@router.get("", response_model=List[CouponResponse], tags=["Coupons"])
async def get_active_coupons(db: AsyncSession = Depends(get_db)):
    """
    Fetch all globally active coupons. 
    Ordered roughly by potential impact (highest % first, then highest flat).
    """
    now = datetime.now(timezone.utc)
    
    # We only want platform-wide coupons (product_id is NULL) for the general checkout flow
    result = await db.execute(
        select(Coupon).where(
            and_(
                Coupon.is_active == True,
                Coupon.product_id.is_(None),
                or_(
                    Coupon.expires_at.is_(None),
                    Coupon.expires_at > now
                )
            )
        ).order_by(Coupon.discount_pct.desc().nulls_last(), Coupon.discount_flat.desc().nulls_last())
    )
    
    coupons = result.scalars().all()
    
    return [
        CouponResponse(
            id=str(c.id),
            code=c.code,
            discount_pct=c.discount_pct,
            discount_flat=c.discount_flat,
            min_spend=c.min_spend,
            display_discount=c.display_discount
        ) for c in coupons
    ]
