"""
DamKoi — Tracking Router

No-login product tracking using anonymous IDs.
Zero-friction: paste a URL → start tracking immediately.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.tracked_product import TrackedProduct
from app.models.product import Product

router = APIRouter(prefix="/track", tags=["Tracking"])


# ── Pydantic Schemas ──────────────────────────────────────────


class TrackProductRequest(BaseModel):
    product_id: UUID
    anon_id: str = Field(..., max_length=128)


class TrackedProductResponse(BaseModel):
    product_id: UUID
    title: str
    url: str
    image_url: Optional[str] = None
    platform: str
    tracked_since: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────


@router.post("", response_model=TrackedProductResponse, status_code=201)
@limiter.limit("20/minute")
async def track_product(
    request: Request,
    body: TrackProductRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Track a product by anonymous ID. No login required.
    Uses browser localStorage for anon_id.
    """
    # Verify product exists
    product_result = await db.execute(
        select(Product).where(Product.id == body.product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Check if already tracked
    existing = await db.execute(
        select(TrackedProduct).where(
            and_(
                TrackedProduct.product_id == body.product_id,
                TrackedProduct.anon_id == body.anon_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Product already tracked.")

    # Create tracking entry
    tracked = TrackedProduct(
        product_id=body.product_id,
        anon_id=body.anon_id,
    )
    db.add(tracked)
    await db.flush()

    return TrackedProductResponse(
        product_id=product.id,
        title=product.title,
        url=product.url,
        image_url=product.image_url,
        platform=product.platform,
        tracked_since=tracked.created_at,
    )


@router.get("", response_model=list[TrackedProductResponse])
@limiter.limit("30/minute")
async def get_tracked_products(
    request: Request,
    anon_id: str = Query(..., max_length=128, description="Anonymous user ID from localStorage"),
    db: AsyncSession = Depends(get_db),
):
    """Get all tracked products for an anonymous user."""
    result = await db.execute(
        select(TrackedProduct, Product)
        .join(Product, TrackedProduct.product_id == Product.id)
        .where(TrackedProduct.anon_id == anon_id)
        .order_by(TrackedProduct.created_at.desc())
    )
    rows = result.all()

    return [
        TrackedProductResponse(
            product_id=product.id,
            title=product.title,
            url=product.url,
            image_url=product.image_url,
            platform=product.platform,
            tracked_since=tracked.created_at,
        )
        for tracked, product in rows
    ]
