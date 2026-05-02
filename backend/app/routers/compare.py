"""
DamKoi — Compare Router

Phase 2 endpoint. Takes a product ID, finds its MatchGroup, and returns
all identical products (across platforms) along with their current prices.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot

router = APIRouter()


@router.get("/products/{product_id}/compare", tags=["Products"])
async def compare_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns all alternative platform pricing for a given product ID.
    Driven by the matching engine (MatchGroup).
    """
    # 1. Fetch the requested product
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2. Find all products in the same match group (or just the product itself if ungrouped)
    if product.match_group_id:
        group_result = await db.execute(
            select(Product)
            .where(Product.match_group_id == product.match_group_id)
            .where(Product.is_active == True)
        )
        related_products = group_result.scalars().all()
    else:
        related_products = [product]

    # 3. Get the latest price for each related product
    alternatives = []
    for p in related_products:
        price_result = await db.execute(
            select(PriceSnapshot)
            .where(PriceSnapshot.product_id == p.id)
            .order_by(PriceSnapshot.scraped_at.desc())
            .limit(1)
        )
        latest_snapshot = price_result.scalar_one_or_none()
        
        current_price = latest_snapshot.price if latest_snapshot else None
        
        alternatives.append({
            "id": str(p.id),
            "platform": p.platform,
            "title": p.title,
            "url": p.url,
            "image_url": p.image_url,
            "current_price": current_price,
            "is_original_request": str(p.id) == str(product_id),
        })

    # 4. Sort alternatives by price (cheapest first)
    # Put products with no price at the end
    alternatives.sort(key=lambda x: x["current_price"] if x["current_price"] is not None else float('inf'))

    return {
        "product_id": str(product.id),
        "match_group_id": str(product.match_group_id) if product.match_group_id else None,
        "alternatives": alternatives,
    }
