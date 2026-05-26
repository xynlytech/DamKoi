"""
DamKoi — Admin API

Protected routes for internal operations.
New routes use Supabase JWT + is_admin flag.
Legacy routes retain x-admin-token for backward compat.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.models.product import Product
from app.models.match_group import MatchGroup
from app.models.price_snapshot import PriceSnapshot
from app.models.user import User
from app.models.alert import Alert
from app.models.coupon import Coupon
from app.models.push_subscription import PushSubscription

router = APIRouter()

_admin_bearer = HTTPBearer(auto_error=False)

# ── Auth dependencies ─────────────────────────────────────────────────────────

async def verify_admin_token(x_admin_token: str = Header(None)):
    """Legacy static-token auth — kept for existing scraper/compare pages."""
    expected = settings.ADMIN_TOKEN
    if not expected:
        if settings.is_production:
            raise HTTPException(status_code=500, detail="ADMIN_TOKEN is not configured")
        expected = "damkoi-admin-secret-dev"
    if not x_admin_token or x_admin_token != expected:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing Admin Token")


async def verify_supabase_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_admin_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify Supabase JWT and require is_admin=True on the User row."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found in database")

    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    return user


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class MergeRequest(BaseModel):
    product_ids: List[str]

class SplitRequest(BaseModel):
    product_ids: List[str]

class CouponCreate(BaseModel):
    platform: str
    code: str
    product_id: Optional[str] = None
    discount_pct: Optional[int] = None
    discount_flat: Optional[int] = None
    min_spend: Optional[int] = None
    payment_method: Optional[str] = None
    expires_at: Optional[datetime] = None

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    platform: Optional[str] = None
    product_id: Optional[str] = None
    discount_pct: Optional[int] = None
    discount_flat: Optional[int] = None
    min_spend: Optional[int] = None
    payment_method: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class UserPatch(BaseModel):
    is_premium: Optional[bool] = None

class AlertPatch(BaseModel):
    is_active: Optional[bool] = None


# ── In-memory cron history (per process, resets on cold start) ────────────────
_cron_history: dict = {}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_products = (await db.execute(select(func.count(Product.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    premium_users = (await db.execute(
        select(func.count(User.id)).where(User.is_premium == True)
    )).scalar() or 0
    active_alerts = (await db.execute(
        select(func.count(Alert.id)).where(Alert.is_active == True)
    )).scalar() or 0
    total_alerts = (await db.execute(select(func.count(Alert.id)))).scalar() or 0
    push_subs = (await db.execute(
        select(func.count(PushSubscription.id)).where(PushSubscription.is_active == True)
    )).scalar() or 0
    total_coupons = (await db.execute(
        select(func.count(Coupon.id)).where(Coupon.is_active == True)
    )).scalar() or 0
    snaps_today = (await db.execute(
        select(func.count(PriceSnapshot.id)).where(PriceSnapshot.scraped_at >= today_start)
    )).scalar() or 0

    return {
        "total_products": total_products,
        "total_users": total_users,
        "premium_users": premium_users,
        "active_alerts": active_alerts,
        "total_alerts": total_alerts,
        "push_subscriptions": push_subs,
        "active_coupons": total_coupons,
        "snapshots_today": snaps_today,
    }


# ── DB Analytics ─────────────────────────────────────────────────────────────

@router.get("/db-analytics")
async def get_db_analytics(
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    # Table row counts
    table_counts_raw = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM products)           AS products,
            (SELECT COUNT(*) FROM price_snapshots)    AS price_snapshots,
            (SELECT COUNT(*) FROM users)              AS users,
            (SELECT COUNT(*) FROM alerts)             AS alerts,
            (SELECT COUNT(*) FROM tracked_products)   AS tracked_products,
            (SELECT COUNT(*) FROM coupons)            AS coupons,
            (SELECT COUNT(*) FROM coupon_applications) AS coupon_applications,
            (SELECT COUNT(*) FROM match_groups)       AS match_groups,
            (SELECT COUNT(*) FROM push_subscriptions) AS push_subscriptions
    """))
    tc = table_counts_raw.fetchone()._mapping

    # Products: stub (never priced) vs real (has price)
    stub_count = (await db.execute(
        select(func.count(Product.id)).where(Product.last_scraped_at.is_(None))
    )).scalar() or 0
    priced_count = (await db.execute(
        select(func.count(Product.id)).where(Product.last_scraped_at.isnot(None))
    )).scalar() or 0

    # Products added in last 7 days
    products_7d = (await db.execute(
        select(func.count(Product.id)).where(Product.first_seen_at >= week_start)
    )).scalar() or 0
    products_today = (await db.execute(
        select(func.count(Product.id)).where(Product.first_seen_at >= today_start)
    )).scalar() or 0

    # Per-platform breakdown
    platform_rows = await db.execute(text("""
        SELECT platform,
               COUNT(*) AS total,
               COUNT(last_scraped_at) AS priced,
               COUNT(*) - COUNT(last_scraped_at) AS stubs
        FROM products
        GROUP BY platform
        ORDER BY total DESC
    """))
    platforms = [
        {"platform": r.platform, "total": r.total, "priced": r.priced, "stubs": r.stubs}
        for r in platform_rows
    ]

    # Snapshots per day — last 7 days
    snap_trend_rows = await db.execute(text("""
        SELECT DATE(scraped_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
        FROM price_snapshots
        WHERE scraped_at >= NOW() - INTERVAL '7 days'
        GROUP BY day
        ORDER BY day ASC
    """))
    snapshot_trend = [
        {"date": str(r.day), "count": r.count}
        for r in snap_trend_rows
    ]

    # DB table sizes (Supabase PostgreSQL)
    size_rows = await db.execute(text("""
        SELECT relname AS table_name,
               pg_size_pretty(pg_total_relation_size(relid)) AS size,
               pg_total_relation_size(relid) AS size_bytes
        FROM pg_catalog.pg_statio_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10
    """))
    table_sizes = [
        {"table": r.table_name, "size": r.size, "size_bytes": r.size_bytes}
        for r in size_rows
    ]

    total_db_bytes = sum(r["size_bytes"] for r in table_sizes)

    return {
        "table_counts": dict(tc),
        "catalog": {
            "total": int(tc["products"]),
            "priced": priced_count,
            "stubs": stub_count,
            "added_today": products_today,
            "added_7d": products_7d,
        },
        "platforms": platforms,
        "snapshot_trend": snapshot_trend,
        "table_sizes": table_sizes,
        "total_db_size_bytes": total_db_bytes,
        "total_db_size": _fmt_bytes(total_db_bytes),
        "supabase_free_limit_bytes": 500 * 1024 * 1024,
        "supabase_usage_pct": round(total_db_bytes / (500 * 1024 * 1024) * 100, 1),
    }


# ── Analytics (30-day time-series) ───────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=6)
    month_start = today_start - timedelta(days=29)

    # Products added per day — last 30 days
    prod_trend_rows = await db.execute(text("""
        SELECT DATE(first_seen_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
        FROM products
        WHERE first_seen_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC
    """))
    products_trend = [
        {"date": str(r.day), "count": int(r.count)}
        for r in prod_trend_rows
    ]

    # Price snapshots per day — last 30 days
    snap_trend_rows = await db.execute(text("""
        SELECT DATE(scraped_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
        FROM price_snapshots
        WHERE scraped_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC
    """))
    snapshots_trend = [
        {"date": str(r.day), "count": int(r.count)}
        for r in snap_trend_rows
    ]

    # Per-platform breakdown
    platform_rows = await db.execute(text("""
        SELECT platform,
               COUNT(*) AS total,
               COUNT(last_scraped_at) AS priced,
               COUNT(*) - COUNT(last_scraped_at) AS stubs
        FROM products
        GROUP BY platform
        ORDER BY total DESC
    """))
    platforms = [
        {"platform": r.platform, "total": int(r.total), "priced": int(r.priced), "stubs": int(r.stubs)}
        for r in platform_rows
    ]

    # Catalog summary
    total_products = (await db.execute(select(func.count(Product.id)))).scalar() or 0
    priced = (await db.execute(
        select(func.count(Product.id)).where(Product.last_scraped_at.isnot(None))
    )).scalar() or 0
    stubs = total_products - priced

    added_today = (await db.execute(
        select(func.count(Product.id)).where(Product.first_seen_at >= today_start)
    )).scalar() or 0
    added_7d = (await db.execute(
        select(func.count(Product.id)).where(Product.first_seen_at >= week_start)
    )).scalar() or 0
    added_30d = (await db.execute(
        select(func.count(Product.id)).where(Product.first_seen_at >= month_start)
    )).scalar() or 0

    # Total snapshots
    total_snaps = (await db.execute(select(func.count(PriceSnapshot.id)))).scalar() or 0
    snaps_today = (await db.execute(
        select(func.count(PriceSnapshot.id)).where(PriceSnapshot.scraped_at >= today_start)
    )).scalar() or 0
    snaps_7d = (await db.execute(
        select(func.count(PriceSnapshot.id)).where(PriceSnapshot.scraped_at >= week_start)
    )).scalar() or 0

    # DB storage
    size_rows = await db.execute(text("""
        SELECT COALESCE(SUM(pg_total_relation_size(relid)), 0) AS total_bytes
        FROM pg_catalog.pg_statio_user_tables
    """))
    total_db_bytes = int(size_rows.scalar() or 0)
    supabase_limit = 500 * 1024 * 1024

    return {
        "products_trend": products_trend,
        "snapshots_trend": snapshots_trend,
        "platforms": platforms,
        "catalog": {
            "total": total_products,
            "priced": priced,
            "stubs": stubs,
            "quality_pct": round(priced / total_products * 100, 1) if total_products else 0,
            "added_today": added_today,
            "added_7d": added_7d,
            "added_30d": added_30d,
        },
        "snapshots": {
            "total": total_snaps,
            "today": snaps_today,
            "last_7d": snaps_7d,
        },
        "storage": {
            "used_bytes": total_db_bytes,
            "used": _fmt_bytes(total_db_bytes),
            "limit_bytes": supabase_limit,
            "limit": "500 MB",
            "usage_pct": round(total_db_bytes / supabase_limit * 100, 1),
        },
    }


def _fmt_bytes(b: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if b < 1024:
            return f"{b:.1f} {unit}"
        b //= 1024
    return f"{b:.1f} TB"


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(
    search: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    q = select(Product).order_by(desc(Product.last_scraped_at))

    filters = []
    if search:
        filters.append(Product.title.ilike(f"%{search}%"))
    if platform:
        filters.append(Product.platform == platform)
    if filters:
        q = q.where(and_(*filters))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(q.offset(offset).limit(limit))
    products = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": str(p.id),
                "title": p.title,
                "platform": p.platform,
                "current_price": p.current_price,
                "in_stock": p.in_stock,
                "is_active": p.is_active,
                "last_scraped_at": p.last_scraped_at.isoformat() if p.last_scraped_at else None,
                "url": p.url,
                "image_url": p.image_url,
            }
            for p in products
        ],
    }


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    premium: Optional[bool] = Query(None),
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    q = select(User).options(selectinload(User.alerts)).order_by(desc(User.created_at))
    if premium is not None:
        q = q.where(User.is_premium == premium)

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(q.offset(offset).limit(limit))
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "auth_provider": u.auth_provider,
                "is_premium": u.is_premium,
                "is_admin": u.is_admin,
                "alert_count": len(u.alerts),
                "active_alert_count": sum(1 for a in u.alerts if a.is_active),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}")
async def patch_user(
    user_id: str,
    payload: UserPatch,
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.is_premium is not None:
        user.is_premium = payload.is_premium

    await db.commit()
    return {"id": str(user.id), "is_premium": user.is_premium}


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts")
async def list_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    active: Optional[bool] = Query(None),
    triggered: Optional[bool] = Query(None),
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    q = (
        select(Alert)
        .options(selectinload(Alert.user), selectinload(Alert.product))
        .order_by(desc(Alert.created_at))
    )

    if active is not None:
        q = q.where(Alert.is_active == active)
    if triggered is True:
        q = q.where(Alert.last_triggered.isnot(None))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(q.offset(offset).limit(limit))
    alerts = result.scalars().all()

    def _price(p):
        if p is None:
            return None
        return p.current_price

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": str(a.id),
                "user_id": str(a.user_id),
                "user_email": a.user.email if a.user else None,
                "product_id": str(a.product_id),
                "product_title": a.product.title if a.product else None,
                "target_price": a.target_price,
                "current_price": _price(a.product),
                "is_active": a.is_active,
                "notify_via": a.notify_via,
                "last_triggered": a.last_triggered.isoformat() if a.last_triggered else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
    }


@router.patch("/alerts/{alert_id}")
async def patch_alert(
    alert_id: str,
    payload: AlertPatch,
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if payload.is_active is not None:
        alert.is_active = payload.is_active

    await db.commit()
    return {"id": str(alert.id), "is_active": alert.is_active}


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()


# ── Coupons ───────────────────────────────────────────────────────────────────

@router.get("/coupons")
async def list_coupons(
    platform: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    q = select(Coupon).order_by(desc(Coupon.created_at))

    if platform:
        q = q.where(Coupon.source.contains(platform))

    total_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(q.offset(offset).limit(limit))
    coupons = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [_coupon_dict(c) for c in coupons],
    }


@router.post("/coupons", status_code=201)
async def create_coupon(
    payload: CouponCreate,
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    product_id = None
    if payload.product_id:
        try:
            product_id = uuid.UUID(payload.product_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid product_id UUID")

    coupon = Coupon(
        product_id=product_id,
        code=payload.code,
        source=payload.platform,
        discount_pct=payload.discount_pct,
        discount_flat=payload.discount_flat,
        min_spend=payload.min_spend,
        payment_method=payload.payment_method,
        expires_at=payload.expires_at,
        is_active=True,
    )
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return _coupon_dict(coupon)


@router.patch("/coupons/{coupon_id}")
async def update_coupon(
    coupon_id: str,
    payload: CouponUpdate,
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    if payload.code is not None:
        coupon.code = payload.code
    if payload.platform is not None:
        coupon.source = payload.platform
    if payload.product_id is not None:
        coupon.product_id = uuid.UUID(payload.product_id)
    if payload.discount_pct is not None:
        coupon.discount_pct = payload.discount_pct
    if payload.discount_flat is not None:
        coupon.discount_flat = payload.discount_flat
    if payload.min_spend is not None:
        coupon.min_spend = payload.min_spend
    if payload.payment_method is not None:
        coupon.payment_method = payload.payment_method
    if payload.expires_at is not None:
        coupon.expires_at = payload.expires_at
    if payload.is_active is not None:
        coupon.is_active = payload.is_active

    await db.commit()
    await db.refresh(coupon)
    return _coupon_dict(coupon)


@router.delete("/coupons/{coupon_id}", status_code=204)
async def delete_coupon(
    coupon_id: str,
    _: User = Depends(verify_supabase_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    await db.delete(coupon)
    await db.commit()


# ── Cron trigger ──────────────────────────────────────────────────────────────

_CRON_JOBS = {
    "alerts": ("check_all_alerts", "app.scraper.tasks"),
    "coupons": ("refresh_platform_coupons", "app.scraper.tasks"),
    "digest": ("send_daily_digest_job", "app.scraper.tasks"),
    "matching": ("run_matching_engine_job", "app.scraper.tasks"),
    "backfill": ("run_continuous_backfill", "app.scraper.tasks"),
    "cleanup": ("cleanup_snapshots", "app.scraper.tasks"),
    "prune": ("prune_dead_products", "app.scraper.tasks"),
}


@router.post("/cron/trigger/{job}")
async def trigger_cron(
    job: str,
    _: User = Depends(verify_supabase_admin),
):
    if job not in _CRON_JOBS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown job '{job}'. Valid: {list(_CRON_JOBS.keys())}",
        )

    fn_name, module_path = _CRON_JOBS[job]
    import importlib
    mod = importlib.import_module(module_path)
    fn = getattr(mod, fn_name)

    if job == "backfill":
        await fn(batch_size=10)
    else:
        await fn()

    _cron_history[job] = datetime.now(timezone.utc).isoformat()
    return {"status": "ok", "job": job, "ran_at": _cron_history[job]}


@router.get("/cron/history")
async def get_cron_history(_: User = Depends(verify_supabase_admin)):
    return {
        job: {"last_run": _cron_history.get(job), "description": _job_description(job)}
        for job in _CRON_JOBS
    }


# ── Legacy routes (x-admin-token) ─────────────────────────────────────────────

@router.get("/match-groups", dependencies=[Depends(verify_admin_token)])
async def get_match_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MatchGroup)
        .options(selectinload(MatchGroup.products))
        .order_by(MatchGroup.updated_at.desc())
        .limit(100)
    )
    groups = result.scalars().all()

    return [
        {
            "id": str(g.id),
            "name": g.name,
            "product_count": len(g.products),
            "products": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "platform": p.platform,
                    "url": p.url,
                    "image_url": p.image_url,
                }
                for p in g.products
            ],
        }
        for g in groups
    ]


@router.post("/match-groups/{group_id}/merge", dependencies=[Depends(verify_admin_token)])
async def merge_products(group_id: str, payload: MergeRequest, db: AsyncSession = Depends(get_db)):
    group_res = await db.execute(select(MatchGroup).where(MatchGroup.id == group_id))
    group = group_res.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Match group not found")

    prod_res = await db.execute(select(Product).where(Product.id.in_(payload.product_ids)))
    products = prod_res.scalars().all()
    if not products:
        raise HTTPException(status_code=400, detail="No valid products found")

    for p in products:
        p.match_group_id = group.id

    await db.commit()
    return {"message": f"Successfully merged {len(products)} products into group."}


@router.post("/match-groups/split", dependencies=[Depends(verify_admin_token)])
async def split_products(payload: SplitRequest, db: AsyncSession = Depends(get_db)):
    prod_res = await db.execute(select(Product).where(Product.id.in_(payload.product_ids)))
    products = prod_res.scalars().all()
    if not products:
        raise HTTPException(status_code=400, detail="No valid products found")

    new_group = MatchGroup(name=products[0].title)
    db.add(new_group)
    await db.flush()

    for p in products:
        p.match_group_id = new_group.id

    await db.commit()
    return {
        "message": f"Successfully split {len(products)} products into new group.",
        "new_group_id": str(new_group.id),
    }


@router.get("/scrapers/health", dependencies=[Depends(verify_admin_token)])
async def get_scraper_health(db: AsyncSession = Depends(get_db)):
    platforms = ["daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"]
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    health = []
    for platform in platforms:
        total_res = await db.execute(
            select(func.count(Product.id)).where(
                Product.platform == platform, Product.is_active == True
            )
        )
        total_products = total_res.scalar() or 0

        last_res = await db.execute(
            select(func.max(Product.last_scraped_at)).where(Product.platform == platform)
        )
        last_scraped_at = last_res.scalar()

        today_res = await db.execute(
            select(func.count(PriceSnapshot.id))
            .join(Product, PriceSnapshot.product_id == Product.id)
            .where(Product.platform == platform, PriceSnapshot.scraped_at >= today_start)
        )
        snaps_today = today_res.scalar() or 0

        recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
        recent_res = await db.execute(
            select(func.count(Product.id)).where(
                Product.platform == platform,
                Product.last_scraped_at >= recent_cutoff,
            )
        )
        recently_scraped = recent_res.scalar() or 0

        hours_since_last = None
        status = "unknown"
        if last_scraped_at:
            if last_scraped_at.tzinfo is None:
                last_scraped_at = last_scraped_at.replace(tzinfo=timezone.utc)
            delta = datetime.now(timezone.utc) - last_scraped_at
            hours_since_last = round(delta.total_seconds() / 3600, 1)
            if hours_since_last < 6:
                status = "healthy"
            elif hours_since_last < 24:
                status = "stale"
            else:
                status = "dead"

        health.append({
            "platform": platform,
            "status": status,
            "total_products": total_products,
            "recently_scraped_6h": recently_scraped,
            "snaps_today": snaps_today,
            "last_scraped_at": last_scraped_at.isoformat() if last_scraped_at else None,
            "hours_since_last_scrape": hours_since_last,
        })

    return health


# ── Helpers ───────────────────────────────────────────────────────────────────

def _coupon_dict(c: Coupon) -> dict:
    return {
        "id": str(c.id),
        "code": c.code,
        "platform": c.source,
        "product_id": str(c.product_id) if c.product_id else None,
        "discount_pct": c.discount_pct,
        "discount_flat": c.discount_flat,
        "min_spend": c.min_spend,
        "payment_method": c.payment_method,
        "is_active": c.is_active,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _job_description(job: str) -> str:
    return {
        "alerts": "Check all price drop alerts and send notifications",
        "coupons": "Refresh platform coupon codes from all sources",
        "digest": "Send daily price digest email to subscribers",
        "matching": "Run cross-platform product matching engine",
        "backfill": "Continuous price history backfill (batch=10)",
        "cleanup": "Delete old price snapshots beyond retention window",
    }.get(job, job)
