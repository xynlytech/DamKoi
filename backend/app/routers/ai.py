"""
DamKoi — AI Router

Exposes the Product Lens AI summaries.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.product import Product
from app.services.ai import AIService
from app.services.cache import cache

router = APIRouter()

class ProductLensResponse(BaseModel):
    pros: List[str]
    cons: List[str]
    verdict: str

@router.get("/{product_id}/lens", response_model=ProductLensResponse, tags=["AI"])
async def get_product_lens(product_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Generate or retrieve an AI-powered summary for a product.
    """
    # 1. Check cache first to avoid LLM spam
    cache_key = f"lens_{product_id}"
    cached_lens = await cache.get(cache_key)
    if cached_lens:
        return cached_lens

    # 2. Fetch product
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 3. Call AI Service
    # We pass 0 for price here since the exact latest price isn't strictly needed for the mock,
    # but in production we would pass the latest PriceSnapshot.
    lens_data = await AIService.generate_product_lens(product.title, 0)
    
    # 4. Cache for 7 days (604800 seconds)
    await cache.set(cache_key, lens_data, expire_seconds=604800)
    
    return lens_data
