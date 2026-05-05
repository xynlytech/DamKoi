"""
DamKoi — Admin API

Protected routes for internal operations.
MVP Security: Depends on a static ADMIN_TOKEN environment variable.
"""

from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.models.product import Product
from app.models.match_group import MatchGroup
from app.models.price_snapshot import PriceSnapshot

router = APIRouter()

# Simple MVP security dependency
async def verify_admin_token(x_admin_token: str = Header(None)):
    expected = getattr(settings, "ADMIN_TOKEN", "damkoi-admin-secret-dev")
    if not x_admin_token or x_admin_token != expected:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing Admin Token")


class MergeRequest(BaseModel):
    product_ids: List[str]

class SplitRequest(BaseModel):
    product_ids: List[str]


@router.get("/match-groups", dependencies=[Depends(verify_admin_token)])
async def get_match_groups(db: AsyncSession = Depends(get_db)):
    """Fetch all match groups and their products for the admin panel."""
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
                    "image_url": p.image_url
                } for p in g.products
            ]
        } for g in groups
    ]


@router.post("/match-groups/{group_id}/merge", dependencies=[Depends(verify_admin_token)])
async def merge_products(group_id: str, payload: MergeRequest, db: AsyncSession = Depends(get_db)):
    """Forcefully inject products into a specific match group."""
    # Verify group exists
    group_res = await db.execute(select(MatchGroup).where(MatchGroup.id == group_id))
    group = group_res.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Match group not found")

    # Fetch products
    prod_res = await db.execute(select(Product).where(Product.id.in_(payload.product_ids)))
    products = prod_res.scalars().all()

    if not products:
        raise HTTPException(status_code=400, detail="No valid products found")

    merged = 0
    for p in products:
        p.match_group_id = group.id
        merged += 1

    await db.commit()
    return {"message": f"Successfully merged {merged} products into group."}


@router.get("/scrapers/health", dependencies=[Depends(verify_admin_token)])
async def get_scraper_health(db: AsyncSession = Depends(get_db)):
    """Per-platform scraper health: last scrape time, product count, today's snapshot count."""
    platforms = ["daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"]
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    health = []
    for platform in platforms:
        # Total products on this platform
        total_res = await db.execute(
            select(func.count(Product.id)).where(
                Product.platform == platform, Product.is_active == True
            )
        )
        total_products = total_res.scalar() or 0

        # Most recent scrape time (MAX last_scraped_at)
        last_res = await db.execute(
            select(func.max(Product.last_scraped_at)).where(Product.platform == platform)
        )
        last_scraped_at = last_res.scalar()

        # Snapshots recorded today
        today_res = await db.execute(
            select(func.count(PriceSnapshot.id))
            .join(Product, PriceSnapshot.product_id == Product.id)
            .where(
                Product.platform == platform,
                PriceSnapshot.scraped_at >= today_start,
            )
        )
        snaps_today = today_res.scalar() or 0

        # Products scraped in the last 6h (healthy = recently active)
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


@router.post("/match-groups/split", dependencies=[Depends(verify_admin_token)])
async def split_products(payload: SplitRequest, db: AsyncSession = Depends(get_db)):
    """
    Remove products from their current group and assign them to a newly created group.
    """
    prod_res = await db.execute(select(Product).where(Product.id.in_(payload.product_ids)))
    products = prod_res.scalars().all()

    if not products:
        raise HTTPException(status_code=400, detail="No valid products found")

    # Create a new group named after the first product being split
    new_group = MatchGroup(name=products[0].title)
    db.add(new_group)
    await db.flush()

    split_count = 0
    for p in products:
        p.match_group_id = new_group.id
        split_count += 1

    await db.commit()
    return {
        "message": f"Successfully split {split_count} products into new group.",
        "new_group_id": str(new_group.id)
    }
