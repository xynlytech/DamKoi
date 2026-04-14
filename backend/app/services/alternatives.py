"""
DamKoi — Similar Cheaper Items (Alternatives Finder)

When a product is flagged as fake discount or overpriced, show similar
cheaper alternatives from the same category on Daraz.

V1: Rule-based filtering. V2+ will use fuzzy matching and embeddings.
"""

from dataclasses import dataclass
from typing import List, Optional
from uuid import UUID


@dataclass
class Alternative:
    """A cheaper alternative product."""
    product_id: UUID
    title: str
    current_price: int  # paisa
    deal_score: int
    image_url: Optional[str]
    url: str
    savings: int  # paisa — how much cheaper than the original


async def find_alternatives(
    product_id: UUID,
    category: str,
    current_price: int,
    db_session,
) -> List[Alternative]:
    """
    Find up to 3 cheaper alternatives in the same category.

    V1 Logic (from PRD Section 6.5):
    1. Get products in same category
    2. Filter: price < 90% of current product price
    3. Filter: deal_score >= 6 (genuinely good deals)
    4. Sort by deal_score descending
    5. Return top 3

    Args:
        product_id: UUID of the product to find alternatives for
        category: Product category to search within
        current_price: Current price of the product in paisa
        db_session: Async database session

    Returns:
        List of up to 3 Alternative objects
    """
    from sqlalchemy import select, func, and_
    from app.models.product import Product
    from app.models.price_snapshot import PriceSnapshot

    # Maximum price for alternatives (90% of current)
    max_price = int(current_price * 0.90)

    # Subquery: get latest price for each product in category
    latest_price_subq = (
        select(
            PriceSnapshot.product_id,
            PriceSnapshot.price,
            func.row_number()
            .over(
                partition_by=PriceSnapshot.product_id,
                order_by=PriceSnapshot.scraped_at.desc()
            )
            .label("rn"),
        )
        .subquery()
    )

    # Main query: products in same category with price < 90% of target
    query = (
        select(Product, latest_price_subq.c.price)
        .join(
            latest_price_subq,
            and_(
                Product.id == latest_price_subq.c.product_id,
                latest_price_subq.c.rn == 1,
            ),
        )
        .where(
            and_(
                Product.category == category,
                Product.id != product_id,
                Product.is_active == True,
                latest_price_subq.c.price <= max_price,
                latest_price_subq.c.price > 0,
            )
        )
        .limit(20)  # get a pool to filter from
    )

    result = await db_session.execute(query)
    candidates = result.all()

    # Build alternatives list
    alternatives = []
    for product, price in candidates:
        savings = current_price - price
        alternatives.append(
            Alternative(
                product_id=product.id,
                title=product.title,
                current_price=price,
                deal_score=5,  # TODO: calculate real deal score
                image_url=product.image_url,
                url=product.url,
                savings=savings,
            )
        )

    # Sort by savings (most savings first) and return top 3
    alternatives.sort(key=lambda a: a.savings, reverse=True)
    return alternatives[:3]
