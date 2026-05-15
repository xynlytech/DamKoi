"""
DamKoi — Daraz Affiliate API Client

Uses Lazada/Daraz Open Platform API (affiliate) to fetch product prices
via HTTP — ~100x faster than Playwright (no browser needed).

Requires:
  DARAZ_APP_KEY      — from affiliate.daraz.com.bd developer console
  DARAZ_APP_SECRET   — from affiliate.daraz.com.bd developer console
  DARAZ_TRACKING_ID  — your affiliate tracking ID (aff_sub param)

API docs: https://open.daraz.com.bd/
Sign spec: https://open.lazada.com/doc/doc.htm#/api/sign
"""

import hashlib
import hmac
import logging
import time
from typing import Optional

import httpx

from app.scraper.base import ScrapedProduct

logger = logging.getLogger(__name__)

DARAZ_API_BASE = "https://open.daraz.com.bd/rest"


def _sign(path: str, params: dict, secret: str) -> str:
    """
    Lazada/Daraz HMAC-SHA256 signing.
    Spec: sort params alphabetically, concat path+k1+v1+k2+v2..., HMAC-SHA256, uppercase hex.
    """
    sorted_params = sorted(params.items())
    query = path + "".join(f"{k}{v}" for k, v in sorted_params)
    return hmac.new(
        secret.encode("utf-8"),
        query.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest().upper()


def _parse_price(val) -> Optional[int]:
    """Parse price string/float to integer paisa (BDT * 100)."""
    if val is None:
        return None
    try:
        return int(round(float(str(val).replace(",", "")) * 100))
    except (ValueError, TypeError):
        return None


def _parse_product(item_id: str, data: dict) -> Optional[ScrapedProduct]:
    """Map Daraz API response to ScrapedProduct."""
    try:
        sale_price = _parse_price(data.get("sale_price") or data.get("price"))
        if not sale_price:
            return None

        original_price = _parse_price(data.get("original_price"))
        discount_pct = None
        if original_price and original_price > sale_price:
            discount_pct = int(round((original_price - sale_price) / original_price * 100))

        stock_val = str(data.get("stock", "")).lower()
        in_stock = stock_val not in ("", "out_of_stock", "0", "false", "unavailable")

        return ScrapedProduct(
            external_id=str(item_id),
            url=data.get("item_url") or data.get("url") or f"https://www.daraz.com.bd/i{item_id}.html",
            title=data.get("title") or data.get("name") or "",
            price=sale_price,
            original_price=original_price,
            discount_pct=discount_pct,
            in_stock=in_stock,
            image_url=data.get("image") or data.get("image_url"),
            category=data.get("category_name") or data.get("category"),
            brand=data.get("brand"),
            model_number=None,
            platform="daraz",
        )
    except Exception as e:
        logger.warning("Failed to parse product %s: %s", item_id, e)
        return None


class DarazAffiliateAPI:
    """
    Fetch Daraz product prices via the Lazada Open Platform affiliate API.

    Usage:
        async with DarazAffiliateAPI(app_key, app_secret, tracking_id) as api:
            products = await api.fetch_batch(["121923118", "106496368"])
    """

    def __init__(self, app_key: str, app_secret: str, tracking_id: str = "damkoi"):
        self.app_key = app_key
        self.app_secret = app_secret
        self.tracking_id = tracking_id
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            timeout=20,
            headers={"User-Agent": "DamKoi/1.0 (price-tracker)"},
        )
        return self

    async def __aexit__(self, *_):
        if self._client:
            await self._client.aclose()

    def _build_params(self, extra: dict) -> dict:
        params = {
            "app_key": self.app_key,
            "timestamp": str(int(time.time() * 1000)),
            "sign_method": "sha256",
            "tracking_id": self.tracking_id,
        }
        params.update(extra)
        return params

    async def fetch_one(self, item_id: str) -> Optional[ScrapedProduct]:
        """Fetch a single product by Daraz item ID."""
        path = "/affiliates/product/get"
        params = self._build_params({"item_id": item_id, "country": "BD"})
        params["sign"] = _sign(path, params, self.app_secret)

        try:
            resp = await self._client.get(f"{DARAZ_API_BASE}{path}", params=params)
            if resp.status_code != 200:
                logger.debug("API %s for item %s: HTTP %s", path, item_id, resp.status_code)
                return None
            data = resp.json()
            if str(data.get("code")) != "0":
                logger.debug("API error for item %s: %s", item_id, data.get("message"))
                return None
            result = data.get("result") or data.get("data") or {}
            return _parse_product(item_id, result)
        except Exception as e:
            logger.warning("fetch_one(%s) failed: %s", item_id, e)
            return None

    async def fetch_batch(
        self,
        item_ids: list[str],
        concurrency: int = 10,
    ) -> list[ScrapedProduct]:
        """
        Fetch prices for many products concurrently.
        concurrency=10 → ~10 req/s, safe for affiliate API rate limits.
        """
        import asyncio

        results: list[ScrapedProduct] = []
        sem = asyncio.Semaphore(concurrency)

        async def fetch_with_sem(item_id: str):
            async with sem:
                product = await self.fetch_one(item_id)
                if product:
                    results.append(product)

        await asyncio.gather(*[fetch_with_sem(iid) for iid in item_ids])
        logger.info("DarazAffiliateAPI: fetched %d/%d products", len(results), len(item_ids))
        return results
