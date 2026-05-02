"""
DamKoi — Coupon Discovery Service

Extracts coupon codes from:
1. Daraz product page embedded JSON (window.__moduleData__ / pageData)
2. Daraz platform-wide promotions API
3. Manual DB upsert for codes found during scraping

Strategy:
- Product pages embed coupon data inside a <script> tag as JSON
- We extract with regex since this works without a browser / Playwright
- Platform-wide codes are fetched from the known Daraz promotions endpoint
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

import httpx
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coupon import Coupon
from app.models.product import Product

log = logging.getLogger("damkoi.coupons")

# ── Daraz platform coupon endpoint (discovered via network inspection) ──────
# This endpoint returns active site-wide promotions and vouchers
DARAZ_VOUCHER_URL = "https://www.daraz.com.bd/m/voucher/getVouchers.php"
DARAZ_PROMO_URL   = "https://www.daraz.com.bd/shop/coupon-center/"

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.daraz.com.bd/",
}


# ── Regex patterns for extracting coupon data from page HTML ────────────────

# Pattern 1: Voucher objects embedded in window.__moduleData__ JSON
VOUCHER_CODE_RE   = re.compile(r'"voucherCode"\s*:\s*"([A-Z0-9\-]{4,30})"')
DISCOUNT_PCT_RE   = re.compile(r'"discountRate"\s*:\s*(\d+)')
DISCOUNT_FLAT_RE  = re.compile(r'"voucherAmount"\s*:\s*(\d+)')
MIN_SPEND_RE      = re.compile(r'"minimumAmount"\s*:\s*(\d+)')
EXPIRY_RE         = re.compile(r'"endTime"\s*:\s*(\d{10,13})')

# Pattern 2: Simple inline discount banners (seller coupons)
SELLER_COUPON_RE  = re.compile(
    r'data-code="([A-Z0-9\-]{4,30})".*?data-discount="(\d+)"',
    re.S
)

# Pattern 3: Promo discount percent from structured JSON
PROMO_CODE_RE = re.compile(
    r'"promotion_type".*?"voucher_code"\s*:\s*"([A-Z0-9\-]{4,30})"',
    re.S
)


def extract_coupons_from_html(html: str, product_id: Optional[UUID] = None) -> List[dict]:
    """
    Parse Daraz product page HTML and extract all available coupon objects.

    Returns a list of dicts with keys matching the Coupon model fields.
    """
    results = []

    # ── Strategy 1: Find all voucher codes with their discount data ──────
    codes = VOUCHER_CODE_RE.findall(html)
    if codes:
        pcts   = DISCOUNT_PCT_RE.findall(html)
        flats  = DISCOUNT_FLAT_RE.findall(html)
        spends = MIN_SPEND_RE.findall(html)
        expirs = EXPIRY_RE.findall(html)

        for i, code in enumerate(set(codes)):  # dedupe
            coupon: dict = {
                "code":       code,
                "product_id": product_id,
                "source":     "daraz_page",
                "is_active":  True,
            }
            if i < len(pcts):
                coupon["discount_pct"] = int(pcts[i])
            if i < len(flats):
                flat = int(flats[i])
                if flat > 0:
                    coupon["discount_flat"] = flat
            if i < len(spends):
                coupon["min_spend"] = int(spends[i])
            if i < len(expirs):
                ts = int(expirs[i])
                # Wayback timestamps are 10-digit (seconds) or 13-digit (ms)
                if ts > 1e12:
                    ts = ts // 1000
                coupon["expires_at"] = datetime.fromtimestamp(ts, tz=timezone.utc)

            results.append(coupon)

    # ── Strategy 2: Simple seller coupon banners ─────────────────────────
    for match in SELLER_COUPON_RE.finditer(html):
        code    = match.group(1)
        pct     = int(match.group(2))
        if not any(r["code"] == code for r in results):
            results.append({
                "code":        code,
                "product_id":  product_id,
                "source":      "seller",
                "discount_pct": pct,
                "is_active":   True,
            })

    log.info(f"Found {len(results)} coupon(s) in page HTML for product {product_id}")
    return results


async def fetch_platform_coupons(client: httpx.AsyncClient) -> List[dict]:
    """
    Fetch Daraz platform-wide vouchers (e.g., WELCOME10, SAVE50).
    These are not product-specific — product_id will be NULL.
    """
    platform_coupons = []
    try:
        resp = await client.get(DARAZ_VOUCHER_URL, headers=HTTP_HEADERS, timeout=10.0)
        if resp.status_code == 200:
            data = resp.json()
            vouchers = data.get("data", {}).get("vouchers", [])
            for v in vouchers:
                code = v.get("voucherCode") or v.get("code")
                if not code:
                    continue
                platform_coupons.append({
                    "code":         code.upper(),
                    "product_id":   None,
                    "source":       "platform",
                    "discount_pct": v.get("discountRate"),
                    "discount_flat": v.get("voucherAmount"),
                    "min_spend":    v.get("minimumAmount"),
                    "is_active":    True,
                })
    except Exception as e:
        log.warning(f"Platform coupon fetch failed: {e}")

    log.info(f"Found {len(platform_coupons)} platform-wide coupon(s).")
    return platform_coupons


async def upsert_coupons(coupons: List[dict], db: AsyncSession) -> int:
    """
    Save extracted coupons to the DB.
    Upserts by code: updates if exists, inserts if new.
    Returns count of upserted rows.
    """
    count = 0
    for data in coupons:
        code = data.get("code")
        if not code:
            continue

        # Check if coupon with this code already exists
        existing = await db.execute(
            select(Coupon).where(Coupon.code == code)
        )
        coupon = existing.scalar_one_or_none()

        if coupon:
            # Update
            coupon.is_active    = data.get("is_active", True)
            coupon.discount_pct  = data.get("discount_pct", coupon.discount_pct)
            coupon.discount_flat = data.get("discount_flat", coupon.discount_flat)
            coupon.min_spend     = data.get("min_spend", coupon.min_spend)
            coupon.expires_at    = data.get("expires_at", coupon.expires_at)
            coupon.updated_at    = datetime.utcnow()
        else:
            # Insert
            coupon = Coupon(
                code          = code.upper(),
                product_id    = data.get("product_id"),
                source        = data.get("source", "daraz_page"),
                discount_pct  = data.get("discount_pct"),
                discount_flat = data.get("discount_flat"),
                min_spend     = data.get("min_spend"),
                expires_at    = data.get("expires_at"),
                is_active     = data.get("is_active", True),
            )
            db.add(coupon)
        count += 1

    await db.commit()
    return count


async def get_coupons_for_product(
    product_id: UUID,
    db: AsyncSession,
    include_platform: bool = True,
) -> List[Coupon]:
    """
    Return all active coupons applicable to a product.
    Includes product-specific coupons + platform-wide ones (if include_platform=True).
    Sorted by discount value descending.
    """
    now = datetime.now(tz=timezone.utc)

    conditions = [
        Coupon.is_active == True,
        # Not expired
        (Coupon.expires_at == None) | (Coupon.expires_at > now),  # noqa
    ]

    if include_platform:
        # Product-specific OR platform-wide (NULL product_id)
        conditions.append(
            (Coupon.product_id == product_id) | (Coupon.product_id == None)  # noqa
        )
    else:
        conditions.append(Coupon.product_id == product_id)

    result = await db.execute(
        select(Coupon)
        .where(and_(*conditions))
        .order_by(
            Coupon.discount_pct.desc().nullslast(),
            Coupon.discount_flat.desc().nullslast(),
        )
        .limit(6)  # show at most 6 coupons in the UI
    )
    return result.scalars().all()
