"""
DamKoi — Products Router

Handles product lookup, price history, verdict, and alternatives.
Most endpoints are public (no auth required) for zero-friction UX.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from app.limiter import limiter
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.services.verdict import get_verdict, Verdict
from app.services.alternatives import find_alternatives, Alternative
from app.services.coupons import get_coupons_for_product
from app.services.memory import memory_service
from app.scraper.daraz_scraper import DarazScraper, _normalize_title
# Removed top-level import to avoid circular dependency
from app.scraper.utils import extract_daraz_product_id, detect_platform_and_id, is_supported_url
from app.services.cache import cache

router = APIRouter(prefix="/products", tags=["Products"])


# ── Read-through cache helpers ────────────────────────────────
# Hard-cache the hot read endpoints so user traffic is served from Redis and
# never touches Postgres (keeps DB cost flat as users grow). Writes invalidate
# the affected keys on price change; otherwise entries expire by TTL.

async def _cached_list(key, model, ttl, builder):
    data = await cache.get(key)
    if data is not None:
        return [model(**d) for d in data]
    result = await builder()
    await cache.set(key, [r.model_dump(mode="json") for r in result], ttl)
    return result


async def _cached_one(key, model, ttl, builder):
    data = await cache.get(key)
    if data is not None:
        return model(**data)
    result = await builder()
    await cache.set(key, result.model_dump(mode="json"), ttl)
    return result


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


class CouponResponse(BaseModel):
    id: UUID
    code: str
    source: Optional[str] = None
    discount_pct: Optional[int] = None
    discount_flat: Optional[int] = None
    min_spend: Optional[int] = None
    expires_at: Optional[datetime] = None
    display_discount: str
    payment_method: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ProductResponse])
async def list_products(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List tracked products with latest price info."""
    async def _build():
        result = await db.execute(
            select(Product)
            .where(Product.last_scraped_at.isnot(None))  # hide un-enriched stubs
            .order_by(Product.first_seen_at.desc())
            .limit(limit)
            .offset(offset)
        )
        products = result.scalars().all()
        out = []
        for product in products:
            price_result = await db.execute(
                select(PriceSnapshot)
                .where(PriceSnapshot.product_id == product.id)
                .order_by(PriceSnapshot.scraped_at.desc())
                .limit(1)
            )
            out.append(_build_product_response(product, price_result.scalar_one_or_none()))
        return out

    return await _cached_list(f"v1:list:{limit}:{offset}", ProductResponse, 600, _build)


@router.get("/search", response_model=list[ProductResponse])
@limiter.limit("60/minute")
async def search_products(
    request: Request,
    q: str = Query(..., min_length=2, description="Search query (title, brand, category)"),
    platform: str = Query("daraz", description="Platform filter"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search over tracked products by title / brand / category.
    Uses PostgreSQL ILIKE for simple substring matching (no index needed at MVP scale).
    """
    from sqlalchemy import or_

    async def _build():
        like = f"%{q}%"
        result = await db.execute(
            select(Product)
            .where(
                and_(
                    Product.platform == platform,
                    Product.is_active == True,
                    Product.last_scraped_at.isnot(None),  # hide un-enriched stubs
                    or_(
                        Product.title.ilike(like),
                        Product.brand.ilike(like),
                        Product.category.ilike(like),
                    )
                )
            )
            .order_by(Product.first_seen_at.desc())
            .limit(limit)
        )
        products = result.scalars().all()
        out = []
        for product in products:
            price_result = await db.execute(
                select(PriceSnapshot)
                .where(PriceSnapshot.product_id == product.id)
                .order_by(PriceSnapshot.scraped_at.desc())
                .limit(1)
            )
            out.append(_build_product_response(product, price_result.scalar_one_or_none()))
        return out

    key = f"v1:search:{platform}:{q.lower().strip()}:{limit}"
    response = await _cached_list(key, ProductResponse, 300, _build)
    # Always record search intent, even on cache hit (market intelligence).
    memory_service.record_event("search", {"query": q, "platform": platform, "results_count": len(response)})
    return response


class DealItem(BaseModel):
    """A product with its embedded deal score for the deals feed."""
    product: ProductResponse
    deal_score: int
    label: str
    explanation: str
    avg_30d: Optional[int] = None


@router.get("/deals", response_model=list[DealItem])
async def get_deals(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_score: int = Query(8, ge=1, le=10, description="Minimum deal score"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    Deals feed — returns products where deal_score >= min_score.
    Supports platform/category filtering and offset-based pagination.
    Filters to products with >= 5 data points (statistically significant only).
    """
    from sqlalchemy import func as sqlfunc

    async def _build():
        subq = (
            select(
                PriceSnapshot.product_id,
                sqlfunc.count(PriceSnapshot.id).label("snap_count"),
            )
            .group_by(PriceSnapshot.product_id)
            .having(sqlfunc.count(PriceSnapshot.id) >= 5)
            .subquery()
        )

        filters = [Product.is_active == True, subq.c.product_id == Product.id]
        if platform:
            filters.append(Product.platform == platform)
        if category:
            filters.append(Product.category.ilike(f"%{category}%"))

        fetch_limit = (offset + limit) * 4
        result = await db.execute(
            select(Product)
            .join(subq, subq.c.product_id == Product.id)
            .where(and_(*filters))
            .order_by(Product.last_scraped_at.desc())
            .limit(fetch_limit)
        )
        products = result.scalars().all()

        deals: list[DealItem] = []
        for product in products:
            snaps_result = await db.execute(
                select(PriceSnapshot)
                .where(PriceSnapshot.product_id == product.id)
                .order_by(PriceSnapshot.scraped_at.desc())
            )
            all_snapshots = snaps_result.scalars().all()
            if not all_snapshots:
                continue

            current_price = all_snapshots[0].price
            cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
            prices_30d = [s.price for s in all_snapshots if s.scraped_at >= cutoff_30d]
            all_prices = [s.price for s in all_snapshots]

            atl_snapshot = min(all_snapshots, key=lambda s: s.price)
            atl_date = atl_snapshot.scraped_at.strftime("%Y-%m-%d") if atl_snapshot else None
            verdict = get_verdict(current_price, prices_30d, all_prices, atl_date)

            if verdict.deal_score >= min_score:
                deals.append(
                    DealItem(
                        product=_build_product_response(product, all_snapshots[0]),
                        deal_score=verdict.deal_score,
                        label=verdict.label.value,
                        explanation=verdict.explanation,
                        avg_30d=verdict.avg_30d,
                    )
                )

        deals.sort(key=lambda d: d.deal_score, reverse=True)
        return deals[offset : offset + limit]

    key = f"v1:deals:{platform}:{category}:{min_score}:{limit}:{offset}"
    return await _cached_list(key, DealItem, 600, _build)


def _build_product_response(product: Product, latest: Optional[PriceSnapshot]) -> ProductResponse:
    """Helper to build a ProductResponse from a product and its latest snapshot."""
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


# ── Endpoints ─────────────────────────────────────────────────


def _resolve_lang(request: Request, lang: Optional[str]) -> str:
    """Resolve lang from query param or Accept-Language header."""
    if lang and lang in ("en", "bn"):
        return lang
    accept = request.headers.get("Accept-Language", "")
    if accept.startswith("bn"):
        return "bn"
    return "en"


@router.get("/lookup", response_model=ProductLookupResponse)
@limiter.limit("10/minute")
async def lookup_product(
    request: Request,
    url: str = Query(..., description="Daraz product URL"),
    lang: Optional[str] = Query(None, description="Language code: 'en' or 'bn'"),
    background_tasks: BackgroundTasks = None, # type: ignore
    db: AsyncSession = Depends(get_db),
):
    """
    Look up a product by its URL (any supported BD platform).
    Returns current price, verdict, and deal score.
    If product is not tracked yet, triggers Just-In-Time (JIT) scraping
    and backfills history in the background.
    """
    # Detect platform and extract external_id from URL
    platform_name, external_id = detect_platform_and_id(url)
    if not platform_name or not external_id:
        if not is_supported_url(url):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported platform URL. Supported platforms: "
                    "Daraz, Cartup, Rokomari, Pickaboo, Chaldal."
                )
            )
        raise HTTPException(
            status_code=400,
            detail="Could not extract product ID from this URL. Please paste the product detail page URL."
        )

    # Check if platform is enabled
    from app.services.flags import is_platform_enabled
    if not is_platform_enabled(platform_name):
        raise HTTPException(
            status_code=503,
            detail=f"{platform_name.capitalize()} support is coming soon!"
        )
    # ── Cache Lookup ───────────────────────────────────────────
    from app.services.cache import cache
    cache_key = f"product_lookup:{external_id}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        return ProductLookupResponse(**cached_data)
    # ───────────────────────────────────────────────────────────

    # Find product in database (multi-platform)
    result = await db.execute(
        select(Product).where(
            and_(
                Product.platform == platform_name,
                Product.external_id == external_id,
            )
        )
    )
    product = result.scalar_one_or_none()

    # ── JIT Scraping for New Products ──────────────────────────
    if not product:
        try:
            async with DarazScraper(headless=True) as scraper:
                scraped = await scraper.scrape_product(url)
            
            if not scraped:
                raise HTTPException(status_code=404, detail="Product could not be scraped from Daraz.")

            # Create product record
            product = Product(
                platform="daraz",
                external_id=scraped.external_id,
                url=scraped.url,
                title=scraped.title,
                normalized_title=_normalize_title(scraped.title),
                category=scraped.category,
                brand=scraped.brand,
                image_url=scraped.image_url,
                first_seen_at=datetime.utcnow()
            )
            db.add(product)
            await db.flush() # Get ID

            # Add initial snapshot
            snapshot = PriceSnapshot(
                product_id=product.id,
                price=scraped.price,
                original_price=scraped.original_price,
                discount_pct=scraped.discount_pct,
                in_stock=scraped.in_stock,
            )
            db.add(snapshot)
            await db.commit()

            # Trigger background backfill from Wayback
            if background_tasks:
                from app.scraper.tasks import backfill_product_history
                background_tasks.add_task(backfill_product_history, product.id)

            # Re-fetch with fresh session state if needed, but 'product' is already in memory
            all_snapshots = [snapshot]
        except HTTPException:
            raise
        except Exception as e:
            print(f"JIT Scrape Failed: {e}")
            # Scraper unavailable (Vercel/serverless) or product unreachable — return 404
            # so the extension shows "not tracked yet" rather than a hard error.
            raise HTTPException(status_code=404, detail="Product not yet tracked. We've queued it for the next scrape cycle.")
    else:
        # Get price history for existing product
        prices_result = await db.execute(
            select(PriceSnapshot)
            .where(PriceSnapshot.product_id == product.id)
            .order_by(PriceSnapshot.scraped_at.desc())
        )
        all_snapshots = prices_result.scalars().all()

    if not all_snapshots:
        # Should not happen with JIT, but for safety:
        raise HTTPException(status_code=404, detail="No price data available yet.")

    # Build verdict
    current_price = all_snapshots[0].price
    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
    prices_30d = [s.price for s in all_snapshots if s.scraped_at >= cutoff_30d]
    all_prices = [s.price for s in all_snapshots]

    # Find all-time low date
    atl_snapshot = min(all_snapshots, key=lambda s: s.price)
    atl_date = atl_snapshot.scraped_at.strftime("%Y-%m-%d") if atl_snapshot else None

    resolved_lang = _resolve_lang(request, lang)
    verdict = get_verdict(current_price, prices_30d, all_prices, atl_date, lang=resolved_lang)

    response = ProductLookupResponse(
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

    # ── Save to Cache ──────────────────────────────────────────
    # Cache for 1 hour, or shorter if we want fresher data
    await cache.set(cache_key, response.model_dump(mode="json"), expire_seconds=3600)
    # ───────────────────────────────────────────────────────────

    return response



@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get product details by ID."""
    cached = await cache.get(f"product_details:{product_id}")
    if cached is not None:
        memory_service.record_event("view", {"id": str(product_id), "title": cached.get("title"), "url": cached.get("url")})
        return ProductResponse(**cached)

    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Record view event
    memory_service.record_event("view", {"id": str(product.id), "title": product.title, "url": product.url})

    # Get latest price
    price_result = await db.execute(
        select(PriceSnapshot)
        .where(PriceSnapshot.product_id == product.id)
        .order_by(PriceSnapshot.scraped_at.desc())
        .limit(1)
    )
    latest = price_result.scalar_one_or_none()

    response = ProductResponse(
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
    await cache.set(f"product_details:{product_id}", response.model_dump(mode="json"), 900)
    return response


@router.get("/{product_id}/price-history", response_model=PriceHistoryResponse)
async def get_price_history(
    product_id: UUID,
    days: int = Query(90, ge=1, le=365, description="Number of days of history"),
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a product. Default: 90 days."""
    async def _build():
        product_result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")

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

    return await _cached_one(f"price_history:{product_id}:{days}", PriceHistoryResponse, 900, _build)


@router.get("/{product_id}/price-history.csv")
async def export_price_history_csv(
    product_id: UUID,
    days: int = Query(365, ge=1, le=1825),
    db: AsyncSession = Depends(get_db),
):
    """Export full price history for a product as a CSV file."""
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    from datetime import timezone as tz
    cutoff = datetime.now(tz.utc) - timedelta(days=days)
    snaps_result = await db.execute(
        select(PriceSnapshot)
        .where(and_(PriceSnapshot.product_id == product_id, PriceSnapshot.scraped_at >= cutoff))
        .order_by(PriceSnapshot.scraped_at.asc())
    )
    snapshots = snaps_result.scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "price_bdt", "original_price_bdt", "discount_pct", "in_stock", "source"])
    for s in snapshots:
        writer.writerow([
            s.scraped_at.strftime("%Y-%m-%d %H:%M:%S"),
            round(s.price / 100, 2),
            round(s.original_price / 100, 2) if s.original_price else "",
            s.discount_pct or "",
            "yes" if s.in_stock else "no",
            getattr(s, "source", "live"),
        ])

    safe_title = "".join(c if c.isalnum() else "_" for c in product.title[:40])
    filename = f"damkoi_{product.platform}_{safe_title}.csv"
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{product_id}/verdict", response_model=VerdictResponse)
async def get_product_verdict(
    request: Request,
    product_id: UUID,
    lang: Optional[str] = Query(None, description="Language code: 'en' or 'bn'"),
    db: AsyncSession = Depends(get_db),
):
    """Get the fake discount verdict for a product."""
    resolved_lang = _resolve_lang(request, lang)

    async def _build():
        result = await db.execute(
            select(PriceSnapshot)
            .where(PriceSnapshot.product_id == product_id)
            .order_by(PriceSnapshot.scraped_at.desc())
        )
        all_snapshots = result.scalars().all()
        if not all_snapshots:
            raise HTTPException(status_code=404, detail="No price data for this product.")

        current_price = all_snapshots[0].price
        cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
        prices_30d = [s.price for s in all_snapshots if s.scraped_at >= cutoff_30d]
        all_prices = [s.price for s in all_snapshots]

        atl_snapshot = min(all_snapshots, key=lambda s: s.price)
        atl_date = atl_snapshot.scraped_at.strftime("%Y-%m-%d") if atl_snapshot else None
        verdict = get_verdict(current_price, prices_30d, all_prices, atl_date, lang=resolved_lang)

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

    return await _cached_one(f"verdict:{product_id}:{resolved_lang}", VerdictResponse, 900, _build)


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




# ── Coupons Endpoint ──────────────────────────────────────────

@router.get("/{product_id}/coupons", response_model=list[CouponResponse], tags=["Products"])
async def get_product_coupons(
    product_id: UUID,
    payment_method: Optional[str] = Query(None, description="Filter by payment method, e.g. 'bkash', 'nagad'. Omit for all."),
    db: AsyncSession = Depends(get_db),
):
    """
    Return active coupons for a product. Optionally filter by payment_method
    to surface bKash/Nagad-specific codes at checkout.
    """
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    coupons = await get_coupons_for_product(product_id, db, include_platform=True)

    # Filter: keep coupons valid for requested method OR with no method restriction
    if payment_method:
        pm = payment_method.strip().lower()
        coupons = [c for c in coupons if c.payment_method is None or c.payment_method == pm]

    return [
        CouponResponse(
            id=c.id,
            code=c.code,
            source=c.source,
            discount_pct=c.discount_pct,
            discount_flat=c.discount_flat,
            min_spend=c.min_spend,
            expires_at=c.expires_at,
            display_discount=c.display_discount,
            payment_method=c.payment_method,
        )
        for c in coupons
    ]


