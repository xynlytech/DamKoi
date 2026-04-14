"""
DamKoi — Products Router

Handles product lookup, price history, verdict, and alternatives.
Most endpoints are public (no auth required) for zero-friction UX.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.services.verdict import get_verdict, Verdict
from app.services.alternatives import find_alternatives, Alternative

router = APIRouter(prefix="/products", tags=["Products"])


# ── Pydantic Response Schemas ─────────────────────────────────


class PricePointResponse(BaseModel):
    price: int
    original_price: Optional[int] = None
    discount_pct: Optional[int] = None
    in_stock: bool
    scraped_at: datetime

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: UUID
    platform: str
    external_id: str
    url: str
    title: str
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    current_price: Optional[int] = None
    original_price: Optional[int] = None
    platform_discount_pct: Optional[int] = None
    in_stock: Optional[bool] = None
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class VerdictResponse(BaseModel):
    deal_score: int
    label: str
    display: str
    explanation: str
    avg_30d: Optional[int] = None
    all_time_low: Optional[int] = None
    all_time_low_date: Optional[str] = None
    data_points: int
    confidence: float


class AlternativeResponse(BaseModel):
    product_id: UUID
    title: str
    current_price: int
    deal_score: int
    image_url: Optional[str] = None
    url: str
    savings: int


class ProductLookupResponse(BaseModel):
    product: ProductResponse
    verdict: VerdictResponse
    tracking_since: Optional[datetime] = None
    data_points: int


class PriceHistoryResponse(BaseModel):
    product_id: UUID
    title: str
    prices: list[PricePointResponse]
    lowest_ever: Optional[int] = None
    highest_ever: Optional[int] = None
    avg_30d: Optional[int] = None
    current_price: Optional[int] = None


@router.get("/", response_model=list[ProductResponse])
async def list_products(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List tracked products with latest price info."""
    result = await db.execute(
        select(Product)
        .order_by(Product.first_seen_at.desc())
        .limit(limit)
        .offset(offset)
    )
    products = result.scalars().all()

    response = []
    for product in products:
        # Get latest price for each
        price_result = await db.execute(
            select(PriceSnapshot)
            .where(PriceSnapshot.product_id == product.id)
            .order_by(PriceSnapshot.scraped_at.desc())
            .limit(1)
        )
        latest = price_result.scalar_one_or_none()

        response.append(
            ProductResponse(
                id=product.id,
                platform=product.platform,
                external_id=product.external_id,
                url=product.url,
                title=product.title,
                category=product.category,
                brand=product.brand,
                image_url=product.image_url,
                current_price=latest.price if latest else None,
                original_price=latest.original_price if latest else None,
                platform_discount_pct=latest.discount_pct if latest else None,
                in_stock=latest.in_stock if latest else None,
                last_updated=latest.scraped_at if latest else None,
            )
        )
    return response


# ── Endpoints ─────────────────────────────────────────────────


@router.get("/lookup", response_model=ProductLookupResponse)
async def lookup_product(
    url: str = Query(..., description="Daraz product URL"),
    db: AsyncSession = Depends(get_db),
):
    """
    Look up a product by its Daraz URL.
    Returns current price, verdict, and deal score.
    If product is not tracked yet, creates a tracking entry.
    """
    # Extract external_id from URL
    external_id = _extract_daraz_product_id(url)
    if not external_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid Daraz product URL. Expected format: https://www.daraz.com.bd/products/..."
        )

    # Find product in database
    result = await db.execute(
        select(Product).where(
            and_(
                Product.platform == "daraz",
                Product.external_id == external_id,
            )
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not yet tracked. It will be picked up in the next scrape cycle."
        )

    # Get price history
    prices_result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product.id)
        .order_by(PriceSnapshot.scraped_at.desc())
    )
    all_snapshots = prices_result.scalars().all()

    if not all_snapshots:
        raise HTTPException(
            status_code=404,
            detail="No price data available yet for this product."
        )

    # Build verdict
    current_price = all_snapshots[0].price
    cutoff_30d = datetime.utcnow() - timedelta(days=30)
    prices_30d = [s.price for s in all_snapshots if s.scraped_at >= cutoff_30d]
    all_prices = [s.price for s in all_snapshots]

    # Find all-time low date
    atl_snapshot = min(all_snapshots, key=lambda s: s.price)
    atl_date = atl_snapshot.scraped_at.strftime("%Y-%m-%d") if atl_snapshot else None

    verdict = get_verdict(current_price, prices_30d, all_prices, atl_date)

    return ProductLookupResponse(
        product=ProductResponse(
            id=product.id,
            platform=product.platform,
            external_id=product.external_id,
            url=product.url,
            title=product.title,
            category=product.category,
            brand=product.brand,
            image_url=product.image_url,
            current_price=current_price,
            original_price=all_snapshots[0].original_price,
            platform_discount_pct=all_snapshots[0].discount_pct,
            in_stock=all_snapshots[0].in_stock,
            last_updated=all_snapshots[0].scraped_at,
        ),
        verdict=VerdictResponse(
            deal_score=verdict.deal_score,
            label=verdict.label.value,
            display=verdict.display,
            explanation=verdict.explanation,
            avg_30d=verdict.avg_30d,
            all_time_low=verdict.all_time_low,
            all_time_low_date=verdict.all_time_low_date,
            data_points=verdict.data_points,
            confidence=verdict.confidence,
        ),
        tracking_since=product.first_seen_at,
        data_points=len(all_snapshots),
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get product details by ID."""
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Get latest price
    price_result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product.id)
        .order_by(PriceSnapshot.scraped_at.desc())
        .limit(1)
    )
    latest = price_result.scalar_one_or_none()

    return ProductResponse(
        id=product.id,
        platform=product.platform,
        external_id=product.external_id,
        url=product.url,
        title=product.title,
        category=product.category,
        brand=product.brand,
        image_url=product.image_url,
        current_price=latest.price if latest else None,
        original_price=latest.original_price if latest else None,
        platform_discount_pct=latest.discount_pct if latest else None,
        in_stock=latest.in_stock if latest else None,
        last_updated=latest.scraped_at if latest else None,
    )


@router.get("/{product_id}/price-history", response_model=PriceHistoryResponse)
async def get_price_history(
    product_id: UUID,
    days: int = Query(90, ge=1, le=365, description="Number of days of history"),
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a product. Default: 90 days."""
    # Verify product exists
    product_result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Get price history
    from datetime import timezone as tz
    cutoff = datetime.now(tz.utc) - timedelta(days=days)
    prices_result = await db.execute(
        select(PriceSnapshot)
        .where(
            and_(
                PriceSnapshot.product_id == product_id,
                PriceSnapshot.scraped_at >= cutoff,
            )
        )
        .order_by(PriceSnapshot.scraped_at.asc())
    )
    snapshots = prices_result.scalars().all()

    prices = [s.price for s in snapshots] if snapshots else []

    return PriceHistoryResponse(
        product_id=product.id,
        title=product.title,
        prices=[
            PricePointResponse(
                price=s.price,
                original_price=s.original_price,
                discount_pct=s.discount_pct,
                in_stock=s.in_stock,
                scraped_at=s.scraped_at,
            )
            for s in snapshots
        ],
        lowest_ever=min(prices) if prices else None,
        highest_ever=max(prices) if prices else None,
        avg_30d=int(sum(prices) / len(prices)) if prices else None,
        current_price=prices[-1] if prices else None,
    )


@router.get("/{product_id}/verdict", response_model=VerdictResponse)
async def get_product_verdict(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get the fake discount verdict for a product."""
    # Get all snapshots
    result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product_id)
        .order_by(PriceSnapshot.scraped_at.desc())
    )
    all_snapshots = result.scalars().all()

    if not all_snapshots:
        raise HTTPException(status_code=404, detail="No price data for this product.")

    current_price = all_snapshots[0].price
    from datetime import timezone
    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
    prices_30d = [s.price for s in all_snapshots if s.scraped_at >= cutoff_30d]
    all_prices = [s.price for s in all_snapshots]

    atl_snapshot = min(all_snapshots, key=lambda s: s.price)
    atl_date = atl_snapshot.scraped_at.strftime("%Y-%m-%d") if atl_snapshot else None

    verdict = get_verdict(current_price, prices_30d, all_prices, atl_date)

    return VerdictResponse(
        deal_score=verdict.deal_score,
        label=verdict.label.value,
        display=verdict.display,
        explanation=verdict.explanation,
        avg_30d=verdict.avg_30d,
        all_time_low=verdict.all_time_low,
        all_time_low_date=verdict.all_time_low_date,
        data_points=verdict.data_points,
        confidence=verdict.confidence,
    )


@router.get("/{product_id}/alternatives", response_model=list[AlternativeResponse])
async def get_alternatives(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get cheaper alternatives for a product in the same category."""
    # Get product
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if not product.category:
        return []

    # Get current price
    price_result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product_id)
        .order_by(PriceSnapshot.scraped_at.desc())
        .limit(1)
    )
    latest = price_result.scalar_one_or_none()
    if not latest:
        return []

    alternatives = await find_alternatives(
        product_id=product.id,
        category=product.category,
        current_price=latest.price,
        db_session=db,
    )

    return [
        AlternativeResponse(
            product_id=a.product_id,
            title=a.title,
            current_price=a.current_price,
            deal_score=a.deal_score,
            image_url=a.image_url,
            url=a.url,
            savings=a.savings,
        )
        for a in alternatives
    ]


# ── Helpers ───────────────────────────────────────────────────


def _extract_daraz_product_id(url: str) -> Optional[str]:
    """
    Extract product ID from a Daraz BD URL.

    Daraz URLs look like:
    https://www.daraz.com.bd/products/samsung-galaxy-a55-5g-i123456789-s987654321.html
    The product ID is the number after 'i' and before '-s'.
    """
    import re

    # Pattern 1: Standard product URL with -i{id}-s{sku}.html
    match = re.search(r"-i(\d+)-s\d+\.html", url)
    if match:
        return match.group(1)

    # Pattern 2: Short URL or other variants
    match = re.search(r"/products/.*-i(\d+)", url)
    if match:
        return match.group(1)

    # Pattern 3: Direct product ID in URL params
    match = re.search(r"[?&]itemId=(\d+)", url)
    if match:
        return match.group(1)

    return None
