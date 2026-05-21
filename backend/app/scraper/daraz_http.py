"""
DamKoi — Daraz HTTP Scraper

Plain httpx-based price fetching — extracts __moduleData__ (current Daraz format)
or __NEXT_DATA__ (legacy) from SSR HTML. ~20x faster than Playwright.

Used as the primary fast path when the Daraz Affiliate API is not configured.
Falls back gracefully to Playwright if blocking (yield < 10%).
"""

import asyncio
import hashlib
import json
import logging
import random
import re
import time
from typing import Optional, List

import httpx

from app.scraper.base import ScrapedProduct
from app.scraper.daraz_scraper import USER_AGENTS, _parse_price_to_paisa

logger = logging.getLogger(__name__)

_NEXT_DATA_RE = re.compile(
    r'<script\s+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

_MODULE_DATA_RE = re.compile(
    r'var\s+__moduleData__\s*=\s*(\{)',
    re.DOTALL,
)

_EXT_ID_RE = re.compile(r"i(\d+)(?:-s\d+)?\.html")

_HEADERS_BASE = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": "https://www.daraz.com.bd/",
    "sec-ch-ua": '"Chromium";v="131", "Not A(Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
}


def _find_listing_items(data: dict) -> list[dict]:
    """
    Walk known __NEXT_DATA__ paths to find the product list on a category/
    search listing page. Returns the raw item list (may be empty).
    """
    # Path 1: most common — mods.listItems
    try:
        items = data["props"]["pageProps"]["mods"]["listItems"]
        if isinstance(items, list) and items:
            return items
    except (KeyError, TypeError):
        pass
    # Path 2: data.modules.listItems
    try:
        items = data["props"]["pageProps"]["data"]["modules"]["listItems"]
        if isinstance(items, list) and items:
            return items
    except (KeyError, TypeError):
        pass
    # Path 3: initialProps variant
    try:
        items = data["props"]["initialProps"]["mods"]["listItems"]
        if isinstance(items, list) and items:
            return items
    except (KeyError, TypeError):
        pass
    # Path 4: deep search for any list that looks like product items
    def _deep(obj, depth=0):
        if depth > 6 or not isinstance(obj, (dict, list)):
            return []
        if isinstance(obj, list) and len(obj) >= 3:
            if all(isinstance(x, dict) and ("itemId" in x or "nid" in x or "name" in x) for x in obj[:3]):
                return obj
        if isinstance(obj, dict):
            for v in obj.values():
                r = _deep(v, depth + 1)
                if r:
                    return r
        return []

    return _deep(data)


def _parse_listing_item(item: dict) -> Optional["ScrapedProduct"]:
    """Convert a single listing-page item dict to ScrapedProduct."""
    from app.scraper.daraz_scraper import _parse_price_to_paisa

    # External ID — itemId, nid, or from URL
    ext_id = str(item.get("itemId") or item.get("nid") or "").strip()

    # Try extracting from productUrl if id not present
    item_url = item.get("itemUrl") or item.get("productUrl") or ""
    if not ext_id:
        m = _EXT_ID_RE.search(item_url)
        ext_id = m.group(1) if m else ""
    if not ext_id:
        return None

    # Full URL
    if item_url.startswith("//"):
        item_url = "https:" + item_url
    elif item_url.startswith("/"):
        item_url = "https://www.daraz.com.bd" + item_url
    elif not item_url.startswith("http"):
        item_url = f"https://www.daraz.com.bd/products/i{ext_id}.html"

    # Title
    title = (item.get("name") or item.get("title") or "").strip()
    if not title:
        return None

    # Price — listing pages store prices as strings like "1,299" or ints
    price = _parse_price_to_paisa(item.get("price")) or _parse_price_to_paisa(item.get("currentPrice"))
    if not price:
        return None
    original_price = _parse_price_to_paisa(item.get("originalPrice")) or _parse_price_to_paisa(item.get("beforePrice"))

    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int((original_price - price) / original_price * 100)

    # Stock
    in_stock_raw = item.get("inStock", item.get("stock", True))
    if isinstance(in_stock_raw, str):
        in_stock = in_stock_raw.lower() not in ("false", "0", "out_of_stock", "outofstock")
    else:
        in_stock = bool(in_stock_raw)

    # Image
    image_url = item.get("image") or item.get("imageUrl") or item.get("img") or ""
    if image_url.startswith("//"):
        image_url = "https:" + image_url
    if not image_url.startswith("http"):
        image_url = None

    brand = item.get("brandName") or item.get("brand") or None
    if isinstance(brand, dict):
        brand = brand.get("name")
    category = item.get("categoryName") or item.get("category") or None

    return ScrapedProduct(
        external_id=ext_id,
        url=item_url,
        title=title,
        price=price,
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=in_stock,
        category=category,
        brand=brand or None,
        image_url=image_url,
        platform="daraz",
    )


async def scrape_listing_page(
    client: httpx.AsyncClient,
    url: str,
    sem: asyncio.Semaphore,
) -> list[ScrapedProduct]:
    """
    Fetch a Daraz category/search listing page and extract ALL product prices
    from __NEXT_DATA__. One page ≈ 30-40 products. Returns empty list on failure.
    """
    async with sem:
        await asyncio.sleep(random.uniform(0.5, 1.5))
        try:
            headers = {**_HEADERS_BASE, "User-Agent": random.choice(USER_AGENTS)}
            resp = await client.get(url, headers=headers, follow_redirects=True)
            if resp.status_code != 200:
                logger.debug("Listing page %s → HTTP %s", url, resp.status_code)
                return []
            m = _NEXT_DATA_RE.search(resp.text)
            if not m:
                logger.debug("Listing page %s → no __NEXT_DATA__", url)
                return []
            data = json.loads(m.group(1))
            items = _find_listing_items(data)
            products = [_parse_listing_item(i) for i in items]
            return [p for p in products if p is not None]
        except Exception as exc:
            logger.debug("Listing page fetch error %s: %s", url, exc)
            return []


def _find_product(data: dict) -> Optional[dict]:
    """Walk known __NEXT_DATA__ paths to find the product object."""
    try:
        return data["props"]["pageProps"]["product"]
    except (KeyError, TypeError):
        pass
    try:
        return data["props"]["pageProps"]["data"]["product"]
    except (KeyError, TypeError):
        pass

    def _search(obj, depth=0):
        if depth > 5:
            return None
        if isinstance(obj, dict):
            if "name" in obj and ("price" in obj or "skuInfos" in obj or "priceInfo" in obj):
                return obj
            for v in obj.values():
                r = _search(v, depth + 1)
                if r:
                    return r
        elif isinstance(obj, list):
            for item in obj[:10]:
                r = _search(item, depth + 1)
                if r:
                    return r
        return None

    return _search(data)


def _parse_product(url: str, data: dict) -> Optional[ScrapedProduct]:
    """Map __NEXT_DATA__ dict to ScrapedProduct."""
    prod = _find_product(data)
    if not prod:
        return None

    title = prod.get("name") or prod.get("title") or ""
    if not title:
        return None

    price: Optional[int] = None
    original_price: Optional[int] = None

    # skuInfos is {skuId: {price, originalPrice, ...}} — pick the first/cheapest entry
    sku_infos = prod.get("skuInfos", {})
    if isinstance(sku_infos, dict) and sku_infos:
        # Prefer the entry that has an explicit "price" key
        sku_entry = next(
            (v for v in sku_infos.values() if isinstance(v, dict) and v.get("price")),
            next(iter(sku_infos.values()), {}),
        )
        if isinstance(sku_entry, dict):
            price = _parse_price_to_paisa(sku_entry.get("price"))
            original_price = _parse_price_to_paisa(sku_entry.get("originalPrice"))

    if not price:
        price = _parse_price_to_paisa(prod.get("price"))
    if not original_price:
        original_price = _parse_price_to_paisa(prod.get("originalPrice"))

    if not price:
        pi = prod.get("priceInfo", {})
        if isinstance(pi, dict):
            price = _parse_price_to_paisa(pi.get("price"))
            if not original_price:
                original_price = _parse_price_to_paisa(pi.get("originalPrice"))

    if not price:
        return None

    m = _EXT_ID_RE.search(url)
    if not m:
        return None
    external_id = m.group(1)

    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int((original_price - price) / original_price * 100)

    in_stock = prod.get("inStock", True)
    if isinstance(in_stock, str):
        in_stock = in_stock.lower() != "false"

    category = None
    crumbs = prod.get("breadcrumbs", [])
    if len(crumbs) >= 2:
        last = crumbs[-2]
        category = last.get("name") if isinstance(last, dict) else str(last)

    brand = prod.get("brand", {})
    if isinstance(brand, dict):
        brand = brand.get("name")
    elif not isinstance(brand, str):
        brand = None

    images = prod.get("images", [])
    image_url = None
    if images:
        image_url = images[0] if isinstance(images[0], str) else images[0].get("src")

    return ScrapedProduct(
        external_id=external_id,
        url=url,
        title=title,
        price=price,
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=bool(in_stock),
        category=category,
        brand=brand or None,
        image_url=image_url,
        platform="daraz",
    )


def _extract_module_data_json(html: str) -> Optional[dict]:
    """Extract and parse var __moduleData__ = {...} from Daraz PDP HTML."""
    m = _MODULE_DATA_RE.search(html)
    if not m:
        return None
    start = m.start(1)
    depth = 0
    for i, c in enumerate(html[start:start + 2_000_000]):
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(html[start: start + i + 1])
                except json.JSONDecodeError:
                    return None
    return None


# ── Daraz mtop detail API ─────────────────────────────────────
#
# The SSR PDP HTML is gated by Akamai — on datacenter IPs Daraz serves a 200
# bot-challenge page with no __moduleData__, and even when it parses, the blob
# only carries tracking.pdt_price (the LIST/MRP price, not the discounted
# checkout price the buyer sees). Both problems are solved by calling the same
# signed h5 mtop gateway the live page uses (mtop.global.detail.web.getDetailInfo):
# it returns the full product detail incl. the real sale price, it accepts
# itemId/skuId parsed straight from the product URL (no PDP fetch needed), and
# the acs-m gateway host is not behind the Akamai page challenge. So mtop is the
# primary scrape path; the PDP HTML parse is kept only as a fallback.

_MTOP_APPKEY = "12574478"
_MTOP_API = "mtop.global.detail.web.getDetailInfo"
_MTOP_V = "1.0"
_MTOP_GW = f"https://acs-m.daraz.com.bd/h5/{_MTOP_API.lower()}/{_MTOP_V}/"

_URL_ID_RE = re.compile(r"i(\d+)-s(\d+)\.html")


def _ids_from_url(url: str) -> Optional[tuple[str, str]]:
    """Pull (item_id, sku_id) straight from a Daraz product URL."""
    m = _URL_ID_RE.search(url)
    return (m.group(1), m.group(2)) if m else None


def _ids_from_module_data(data: dict) -> Optional[tuple[str, str, str]]:
    """Pull (item_id, sku_id, seller_id) from a __moduleData__ dict."""
    try:
        pk = data["data"]["root"]["fields"]["primaryKey"]
    except (KeyError, TypeError):
        return None
    item_id = str(pk.get("itemId") or "").strip()
    sku_id = str(pk.get("defaultSkuId") or pk.get("skuId") or "").strip()
    seller_id = str(pk.get("sellerId") or "").strip()
    if not (item_id and sku_id):
        return None
    return item_id, sku_id, seller_id


def _price_node_to_paisa(node: dict) -> Optional[int]:
    """Convert a Daraz price node ({value, text}) to integer paisa."""
    if not isinstance(node, dict):
        return None
    val = node.get("value")
    if isinstance(val, (int, float)) and val > 0:
        return int(round(val * 100))
    return _parse_price_to_paisa(node.get("text"))


async def _fetch_mtop_module(
    client: httpx.AsyncClient,
    item_id: str,
    sku_id: str,
    seller_id: str = "",
) -> Optional[dict]:
    """
    Call the signed mtop getDetailInfo endpoint and return the parsed `module`
    dict (full product detail incl. real price). Returns None on failure.
    """
    page_url = f"https://www.daraz.com.bd/products/-i{item_id}-s{sku_id}.html"
    req_params = f"itemId={item_id}&sellerId={seller_id}&skuId={sku_id}"
    data_str = json.dumps(
        {
            "itemId": item_id,
            "skuId": sku_id,
            "pageId": item_id,
            "sellerId": seller_id,
            "deviceType": "pc",
            "path": page_url,
            "uri": page_url,
            "headerParams": "{}",
            "cookieParams": "{}",
            "requestParams": req_params,
        },
        separators=(",", ":"),
    )

    async def _call() -> dict:
        tk = client.cookies.get("_m_h5_tk") or ""
        token = tk.split("_")[0] if tk else ""
        t = str(int(time.time() * 1000))
        sign = hashlib.md5(
            f"{token}&{t}&{_MTOP_APPKEY}&{data_str}".encode()
        ).hexdigest()
        params = {
            "jsv": "2.7.2",
            "appKey": _MTOP_APPKEY,
            "t": t,
            "sign": sign,
            "api": _MTOP_API,
            "v": _MTOP_V,
            "type": "originaljson",
            "dataType": "json",
            "H5Request": "true",
            "data": data_str,
        }
        r = await client.get(
            _MTOP_GW,
            params=params,
            headers={
                "User-Agent": random.choice(USER_AGENTS),
                "Referer": "https://www.daraz.com.bd/",
            },
        )
        return r.json()

    try:
        body = await _call()
        ret = (body.get("ret") or [""])[0]
        # First hit usually fails with an empty/expired token but sets the
        # _m_h5_tk cookie — retry once now that we can sign correctly.
        if not ret.startswith("SUCCESS") and "TOKEN" in ret.upper():
            body = await _call()
            ret = (body.get("ret") or [""])[0]
        if not ret.startswith("SUCCESS"):
            return None

        module_raw = body.get("data", {}).get("module")
        return json.loads(module_raw) if module_raw else None
    except Exception as e:
        logger.debug("mtop fetch failed for i%s-s%s: %s", item_id, sku_id, e)
        return None


def _price_from_module(module: dict, sku_id: str) -> Optional[dict]:
    """
    Extract {"price", "original_price", "discount_pct"} (paisa) from a mtop
    module's skuInfos. Returns None if no sale price is present.
    """
    sku_infos = module.get("skuInfos") or {}
    sku = sku_infos.get(sku_id) or sku_infos.get("0") or {}
    if not sku and sku_infos:
        sku = next(iter(sku_infos.values()), {})
    price_node = sku.get("price") or {}

    sale = _price_node_to_paisa(price_node.get("salePrice"))
    if not sale:
        return None
    original = _price_node_to_paisa(price_node.get("originalPrice"))

    discount_pct = None
    if original and original > sale:
        discount_pct = int((original - sale) / original * 100)

    return {
        "price": sale,
        "original_price": original if (original and original > sale) else None,
        "discount_pct": discount_pct,
    }


def _product_from_mtop_module(
    url: str, module: dict, item_id: str, sku_id: str
) -> Optional[ScrapedProduct]:
    """Build a full ScrapedProduct from a mtop detail `module` dict."""
    price = _price_from_module(module, sku_id)
    if not price:
        return None

    tracking = module.get("tracking") or {}
    product = module.get("product") or {}
    sku_infos = module.get("skuInfos") or {}
    sku = sku_infos.get(sku_id) or sku_infos.get("0") or {}
    if not sku and sku_infos:
        sku = next(iter(sku_infos.values()), {})

    title = (product.get("title") or tracking.get("pdt_name") or "").strip()
    if not title:
        return None

    image_url = tracking.get("pdt_photo") or sku.get("image") or product.get("image") or None

    cats = tracking.get("pdt_category")
    category = cats[-1] if isinstance(cats, list) and cats else None

    brand_raw = product.get("brand")
    if isinstance(brand_raw, dict):
        brand = brand_raw.get("name")
    elif isinstance(brand_raw, str):
        brand = brand_raw
    else:
        brand = tracking.get("brand_name")

    op = sku.get("operation") or {}
    in_stock = not op.get("disable", False)

    return ScrapedProduct(
        external_id=item_id,
        url=url,
        title=title,
        price=price["price"],
        original_price=price["original_price"],
        discount_pct=price["discount_pct"],
        in_stock=in_stock,
        category=category,
        brand=brand or None,
        image_url=image_url,
        platform="daraz",
    )


async def _scrape_via_mtop(
    client: httpx.AsyncClient, url: str
) -> Optional[ScrapedProduct]:
    """Primary Daraz scrape path — full product via mtop, no PDP fetch."""
    ids = _ids_from_url(url)
    if not ids:
        return None
    module = await _fetch_mtop_module(client, ids[0], ids[1])
    if not module:
        return None
    return _product_from_mtop_module(url, module, ids[0], ids[1])


async def _fetch_mtop_price(
    client: httpx.AsyncClient,
    page_url: str,
    item_id: str,
    sku_id: str,
    seller_id: str = "",
) -> Optional[dict]:
    """Back-compat helper: real price only, used by the Playwright scraper."""
    module = await _fetch_mtop_module(client, item_id, sku_id, seller_id)
    if not module:
        return None
    return _price_from_module(module, sku_id)


def _parse_module_data_product(url: str, data: dict) -> Optional[ScrapedProduct]:
    """Map __moduleData__ dict (current Daraz PDP format) to ScrapedProduct."""
    try:
        fields = data["data"]["root"]["fields"]
    except (KeyError, TypeError):
        return None

    tracking = fields.get("tracking") or {}
    product = fields.get("product") or {}
    primary = fields.get("primaryKey") or {}
    sku_infos = fields.get("skuInfos") or {}

    title = (tracking.get("pdt_name") or product.get("title") or "").strip()
    if not title:
        return None

    external_id = str(primary.get("itemId") or "").strip()
    if not external_id:
        m = _EXT_ID_RE.search(url)
        external_id = m.group(1) if m else ""
    if not external_id:
        return None

    # Resolve the default SKU object — contains the accurate checkout price
    default_sku = str(primary.get("defaultSkuId") or primary.get("skuId") or "0")
    sku_obj = sku_infos.get(default_sku) or sku_infos.get("0") or {}
    if not sku_obj and sku_infos:
        sku_obj = next(iter(sku_infos.values()), {})

    # Sale price: skuInfos.price is the actual checkout/discounted price.
    # tracking.pdt_price is the list/original price used for analytics revenue tracking —
    # use it only as a fallback when skuInfos has no price.
    price = (
        _parse_price_to_paisa(sku_obj.get("price"))
        or _parse_price_to_paisa(sku_obj.get("salePrice"))
        or _parse_price_to_paisa(tracking.get("pdt_price"))
    )
    if not price:
        return None

    # Original/list price: prefer skuInfos fields, then check if pdt_price is
    # the list price (it will be > price when a discount is active).
    original_price: Optional[int] = (
        _parse_price_to_paisa(sku_obj.get("originalPrice"))
        or _parse_price_to_paisa(sku_obj.get("listPrice"))
    )
    if not original_price:
        pdt_price_raw = _parse_price_to_paisa(tracking.get("pdt_price"))
        if pdt_price_raw and pdt_price_raw > price:
            # pdt_price is the original/MRP — use it directly
            original_price = pdt_price_raw
        else:
            disc_raw = str(tracking.get("pdt_discount") or "").strip()
            if disc_raw.endswith("%"):
                try:
                    disc_pct = float(disc_raw.rstrip("%"))
                    if 0 < disc_pct < 100:
                        original_price = int(price / (1 - disc_pct / 100))
                except (ValueError, ZeroDivisionError):
                    pass
            elif disc_raw:
                original_price = _parse_price_to_paisa(disc_raw) or None

    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int((original_price - price) / original_price * 100)

    # in_stock — operation.disable == False means in stock
    op = sku_obj.get("operation") or {}
    in_stock = not op.get("disable", False)

    image_url = tracking.get("pdt_photo") or product.get("image") or None

    cats = tracking.get("pdt_category") or []
    category = cats[-1] if isinstance(cats, list) and cats else None

    brand_raw = product.get("brand") or {}
    brand = brand_raw.get("name") if isinstance(brand_raw, dict) else (brand_raw or None)
    if not brand:
        brand = tracking.get("brand_name") or None

    return ScrapedProduct(
        external_id=external_id,
        url=url,
        title=title,
        price=price,
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=in_stock,
        category=category,
        brand=brand or None,
        image_url=image_url,
        platform="daraz",
    )


async def _fetch_one(
    client: httpx.AsyncClient,
    url: str,
    sem: asyncio.Semaphore,
) -> Optional[ScrapedProduct]:
    async with sem:
        await asyncio.sleep(random.uniform(0.5, 1.5))
        try:
            # Primary: mtop detail API using IDs from the URL. Bypasses the
            # Akamai PDP page challenge and returns the real sale price.
            mtop_product = await _scrape_via_mtop(client, url)
            if mtop_product:
                return mtop_product

            # Fallback: parse the SSR PDP HTML (older path / non-standard URLs).
            headers = {**_HEADERS_BASE, "User-Agent": random.choice(USER_AGENTS)}
            resp = await client.get(url, headers=headers, follow_redirects=True)
            if resp.status_code in (403, 429, 503):
                return None
            if resp.status_code != 200:
                return None
            html = resp.text
            # Try current format first (__moduleData__), then legacy (__NEXT_DATA__)
            module_data = _extract_module_data_json(html)
            if module_data:
                result = _parse_module_data_product(url, module_data)
                if result:
                    # SSR price is the LIST price — replace it with the real
                    # discounted price from the signed mtop detail API.
                    ids = _ids_from_module_data(module_data)
                    if ids:
                        real = await _fetch_mtop_price(client, url, *ids)
                        if real:
                            result.price = real["price"]
                            result.original_price = real["original_price"]
                            result.discount_pct = real["discount_pct"]
                    return result
            m = _NEXT_DATA_RE.search(html)
            if m:
                try:
                    data = json.loads(m.group(1))
                    return _parse_product(url, data)
                except json.JSONDecodeError:
                    pass
            return None
        except Exception as e:
            logger.debug("HTTP fetch failed %s: %s", url, e)
            return None


async def scrape_batch_http(
    urls: List[str],
    concurrency: int = 10,
) -> List[ScrapedProduct]:
    """
    Fetch prices for many Daraz product pages via plain HTTP.
    Returns empty list if Akamai is blocking (success rate < 10%).
    """
    if not urls:
        return []

    sem = asyncio.Semaphore(concurrency)
    results: List[ScrapedProduct] = []

    # Use HTTP/2 if h2 package is available, plain HTTP/1.1 otherwise
    try:
        import h2  # noqa: F401
        client_kwargs = {"timeout": 15, "http2": True}
    except ImportError:
        client_kwargs = {"timeout": 15}

    async with httpx.AsyncClient(**client_kwargs) as client:
        responses = await asyncio.gather(
            *[_fetch_one(client, url, sem) for url in urls]
        )

    results = [r for r in responses if r is not None]
    rate = len(results) / len(urls) if urls else 0
    logger.info(
        "HTTP scrape: %d/%d products (%.0f%% success rate)",
        len(results), len(urls), rate * 100,
    )
    return results
