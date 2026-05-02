"""
DamKoi — Matching Engine V2 (Fuzzy String Matching)

Runs periodically to cluster identical products from different platforms
into unified MatchGroups.
"""

import re
import logging
from rapidfuzz import fuzz
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.match_group import MatchGroup
from app.database import async_session_factory

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.82  # Min score to cluster


def normalize_title(title: str) -> str:
    """Normalize title for fuzzy matching."""
    if not title:
        return ""
    title = title.lower()
    # Remove punctuation
    title = re.sub(r"[^\w\s]", "", title)
    # Remove marketing fluff
    title = re.sub(r"\b(free|shipping|official|warranty|authentic|original|global|version|rom|ram)\b", "", title)
    # Collapse multiple spaces
    title = re.sub(r"\s+", " ", title)
    return title.strip()


def match_products(a: Product, b: Product) -> float:
    """Calculate similarity score between two products."""
    norm_a = normalize_title(a.title)
    norm_b = normalize_title(b.title)

    # Base score using token sort ratio
    title_score = fuzz.token_sort_ratio(norm_a, norm_b) / 100.0

    # Model number bonus (if both have model numbers and they match)
    model_bonus = 0.0
    if a.model_number and b.model_number:
        if a.model_number.lower() == b.model_number.lower():
            model_bonus = 0.3
        else:
            # Penalty if model numbers explicitly mismatch
            model_bonus = -0.2

    return min(title_score + model_bonus, 1.0)


async def cluster_ungrouped_products():
    """Finds products without a MatchGroup and assigns them."""
    logger.info("Starting matching engine job...")
    
    async with async_session_factory() as db:
        # 1. Fetch products without a match group
        result = await db.execute(
            select(Product)
            .where(Product.match_group_id.is_(None))
            .limit(500)  # Process in batches
        )
        ungrouped_products = result.scalars().all()

        if not ungrouped_products:
            logger.info("No ungrouped products found.")
            return

        # 2. Fetch all existing match groups (and their representative product)
        # For performance, we could just fetch one product per group to compare against.
        # But for now, we'll fetch all products that ARE in a group, up to a limit, 
        # or just fetch the first product of each group.
        # To avoid massive memory usage, let's fetch one representative product per group.
        # A simpler approach: Just fetch all active products that are in a group, 
        # but since that could be large, let's just do a pairwise comparison of the ungrouped batch
        # against itself, and create new groups. Then next run will cluster more.
        
        # Actually, let's fetch recent active products that have a group
        grouped_result = await db.execute(
            select(Product)
            .where(Product.match_group_id.isnot(None))
            .order_by(Product.last_scraped_at.desc())
            .limit(2000)
        )
        grouped_products = grouped_result.scalars().all()

        match_count = 0
        new_group_count = 0

        for product in ungrouped_products:
            best_score = 0.0
            best_match = None

            # First, try to match against already grouped products
            for gp in grouped_products:
                score = match_products(product, gp)
                if score > best_score:
                    best_score = score
                    best_match = gp

            if best_score >= MATCH_THRESHOLD and best_match:
                product.match_group_id = best_match.match_group_id
                match_count += 1
            else:
                # No existing group matches. Try matching against other ungrouped in this batch.
                # To simplify, we just create a new MatchGroup for it.
                # If there are duplicates in the ungrouped batch, they'll be clustered 
                # together on the NEXT run (because one gets grouped now, the other later).
                # Actually, let's just create a new group.
                new_group = MatchGroup(name=product.title)
                db.add(new_group)
                await db.flush() # get new_group.id
                product.match_group_id = new_group.id
                grouped_products.append(product) # Add to pool for subsequent comparisons
                new_group_count += 1

        await db.commit()
        logger.info(f"Matching engine finished. Clustered {match_count} into existing groups, created {new_group_count} new groups.")

