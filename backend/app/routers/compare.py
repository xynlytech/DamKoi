"""
DamKoi — Compare Router

Takes a product ID, finds its MatchGroup, and returns all identical products
(across platforms) with their current prices.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import Product
from app.services.cache import cache

router = APIRouter()


@router.get("/products/{product_id}/compare", tags=["Products"])
async def compare_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns all alternative platform pricing for a given product ID.
    Driven by the matching engine (MatchGroup).
    """
    cache_key = f"compare:{product_id}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.match_group_id:
        group_result = await db.execute(
            select(Product)
            .where(Product.match_group_id == product.match_group_id)
            .where(Product.is_active == True)
        )
        related_products = group_result.scalars().all()
    else:
        related_products = [product]

    # Use denormalized current_price — avoids N+1 snapshot queries per product.
    alternatives = [
        {
            "id": str(p.id),
            "platform": p.platform,
            "title": p.title,
            "url": p.url,
            "image_url": p.image_url,
            "current_price": p.current_price,
            "is_original_request": str(p.id) == str(product_id),
        }
        for p in related_products
    ]

    alternatives.sort(key=lambda x: x["current_price"] if x["current_price"] is not None else float("inf"))

    response = {
        "product_id": str(product.id),
        "match_group_id": str(product.match_group_id) if product.match_group_id else None,
        "alternatives": alternatives,
    }
    await cache.set(cache_key, response, 3600)
    return response
