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
    3. Calculate real deal_score for each
    4. Filter: deal_score >= 6 (genuinely good deals)
    5. Sort by deal_score descending
    6. Return top 3

    Args:
        product_id: UUID of the product to find alternatives for
        category: Product category to search within
        current_price: Current price of the product in paisa
        db_session: Async database session

    Returns:
        List of up to 3 Alternative objects
    """
    from sqlalchemy import select, func, and_
    from datetime import datetime, timezone
    from statistics import mean
    from app.models.product import Product
    from app.models.price_snapshot import PriceSnapshot
    from app.services.verdict import _calculate_deal_score

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

    # Build alternatives list with real deal scores
    alternatives = []
    for product, price in candidates:
        savings = current_price - price

        # Calculate real deal score for this alternative
        deal_score = await _get_deal_score_for_product(product.id, db_session)

        # Only include if it's a good deal (score >= 6)
        if deal_score >= 6:
            alternatives.append(
                Alternative(
                    product_id=product.id,
                    title=product.title,
                    current_price=price,
                    deal_score=deal_score,
                    image_url=product.image_url,
                    url=product.url,
                    savings=savings,
                )
            )

    # Sort by deal score (highest first) and return top 3
    alternatives.sort(key=lambda a: a.deal_score, reverse=True)
    return alternatives[:3]


async def _get_deal_score_for_product(product_id: UUID, db_session) -> int:
    """
    Get the deal score for a specific product.

    Returns score between 1-10, or 5 if insufficient data.
    """
    from sqlalchemy import select
    from datetime import datetime, timezone, timedelta
    from statistics import mean
    from app.models.price_snapshot import PriceSnapshot
    from app.services.verdict import _calculate_deal_score

    try:
        # Get all price snapshots for this product
        query = select(PriceSnapshot).where(
            PriceSnapshot.product_id == product_id
        ).order_by(PriceSnapshot.scraped_at.desc())

        result = await db_session.execute(query)
        snapshots = result.scalars().all()

        if not snapshots:
            return 5  # No data

        # Get prices from last 30 days
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        prices_30d = [s.price for s in snapshots if s.scraped_at >= thirty_days_ago]
        all_prices = [s.price for s in snapshots]

        # Need at least 5 data points to calculate a score
        if len(prices_30d) < 5:
            return 5  # Insufficient data

        current_price = snapshots[0].price
        avg_30d = int(mean(prices_30d))
        all_time_low = min(all_prices)

        # Calculate discount from average
        discount_from_avg = (avg_30d - current_price) / avg_30d if avg_30d > 0 else 0.0

        # Get deal score using the same logic as verdict
        deal_score = _calculate_deal_score(current_price, avg_30d, all_time_low, discount_from_avg)

        return deal_score
    except Exception:
        return 5  # Default to neutral score on error
