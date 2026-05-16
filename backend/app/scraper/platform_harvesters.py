"""
DamKoi — Multi-Platform Product URL Harvesters

Discovers product URLs for all non-Daraz BD platforms via:
  1. Sitemaps (XML) — fast, comprehensive, bypasses anti-bot on listing pages
  2. Category page scraping (httpx + BeautifulSoup) — Rokomari only (PHP-rendered)

Seeds DB with stub rows (title="[Discovered]", no price yet).
The scraper workflow fills prices on the next run.

Platforms handled: rokomari, pickaboo, cartup, chaldal, othoba
"""

import asyncio
import gzip
import logging
import random
import re
from typing import Callable, Optional, Set
from xml.etree import ElementTree

import httpx
from bs4 import BeautifulSoup

from app.database import async_session_factory
from app.models.product import Product
from app.scraper.daraz_scraper import USER_AGENTS

log = logging.getLogger("damkoi.platform_harvesters")

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
}


# ── Common utilities ──────────────────────────────────────────────────────────

async def _fetch_text(client: httpx.AsyncClient, url: str) -> str:
    try:
        resp = await client.get(
            url,
            headers={**_HEADERS, "User-Agent": random.choice(USER_AGENTS)},
            follow_redirects=True,
            timeout=_TIMEOUT,
        )
        if resp.status_code == 200:
            # Handle gzip-compressed sitemaps (.xml.gz or Content-Encoding: gzip)
            if url.endswith(".gz") or resp.headers.get("content-encoding") == "gzip":
                try:
                    return gzip.decompress(resp.content).decode("utf-8", errors="replace")
                except Exception:
                    pass
            return resp.text
    except Exception as exc:
        log.debug("Fetch error %s: %s", url, exc)
    return ""


def _sitemap_locs(xml_text: str) -> list[str]:
    """Extract all <loc> text nodes from a sitemap or sitemap-index."""
    try:
        root = ElementTree.fromstring(xml_text.encode())
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        return [
            el.text.strip()
            for el in root.findall(".//sm:loc", ns)
            if el.text and el.text.strip()
        ]
    except ElementTree.ParseError:
        # Regex fallback for malformed XML
        return re.findall(r"<loc>\s*([^<]+)\s*</loc>", xml_text)


async def _collect_from_sitemap(
    client: httpx.AsyncClient,
    sitemap_url: str,
    product_re: re.Pattern,
    depth: int = 0,
    max_depth: int = 2,
    max_children: int = 50,
) -> Set[str]:
    """
    Recursively walk sitemap / sitemap-index.
    Returns all URLs that match product_re.
    """
    found: Set[str] = set()
    text = await _fetch_text(client, sitemap_url)
    if not text:
        return found

    locs = _sitemap_locs(text)
    child_sitemaps: list[str] = []

    for loc in locs:
        if loc.lower().endswith(".xml") or "sitemap" in loc.lower().split("/")[-1]:
            child_sitemaps.append(loc)
        elif product_re.search(loc):
            found.add(loc)

    if child_sitemaps and depth < max_depth:
        tasks = [
            _collect_from_sitemap(client, s, product_re, depth + 1, max_depth, max_children)
            for s in child_sitemaps[:max_children]
        ]
        batches = await asyncio.gather(*tasks, return_exceptions=True)
        for batch in batches:
            if isinstance(batch, set):
                found.update(batch)

    return found


async def _seed_db(
    urls: Set[str],
    platform: str,
    extract_id: Callable[[str], Optional[str]],
) -> int:
    """Bulk insert URL stubs. ON CONFLICT DO NOTHING makes it idempotent."""
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    to_insert = []
    seen_ids: Set[str] = set()
    for url in urls:
        ext_id = extract_id(url)
        if not ext_id or ext_id in seen_ids:
            continue
        seen_ids.add(ext_id)
        to_insert.append({
            "platform": platform,
            "external_id": ext_id,
            "url": url,
            "title": "[Discovered]",
            "is_active": True,
        })

    if not to_insert:
        return 0

    seeded = 0
    async with async_session_factory() as db:
        for i in range(0, len(to_insert), 2000):
            chunk = to_insert[i : i + 2000]
            stmt = (
                pg_insert(Product)
                .values(chunk)
                .on_conflict_do_nothing(index_elements=["platform", "external_id"])
            )
            result = await db.execute(stmt)
            seeded += result.rowcount or 0
            await db.commit()

    return seeded


# ── Rokomari ──────────────────────────────────────────────────────────────────
# Server-rendered PHP — httpx + BeautifulSoup works well.
# URL format: https://www.rokomari.com/book/{numeric_id}/{slug}

_ROKO_PRODUCT_RE = re.compile(
    r"https?://(?:www\.)?rokomari\.com/book/\d+/[^\"'<>\s]+",
    re.IGNORECASE,
)
_ROKO_ID_RE = re.compile(r"/book/(\d+)/")

ROKOMARI_CATEGORIES = [
    "social-science-books",
    "islamic-books",
    "literature-fiction",
    "science-technology-books",
    "history-biographies",
    "children-books",
    "academic-books",
    "art-photography-books",
    "health-medicine-books",
    "business-economics-books",
    "comics-manga",
    "self-help",
    "cooking-food-books",
    "religion-spirituality",
    "law-books",
    "language-books",
    "engineering-books",
    "medical-books",
]


def _roko_extract_id(url: str) -> Optional[str]:
    m = _ROKO_ID_RE.search(url)
    return m.group(1) if m else None


async def harvest_rokomari() -> int:
    found: Set[str] = set()
    log.info("Rokomari: starting harvest...")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        # Sitemap first (fastest path)
        for sitemap_url in [
            "https://www.rokomari.com/sitemap.xml",
            "https://www.rokomari.com/sitemap_index.xml",
        ]:
            urls = await _collect_from_sitemap(client, sitemap_url, _ROKO_PRODUCT_RE)
            if urls:
                found.update(urls)
                log.info("Rokomari: %d URLs from sitemap", len(urls))
                break

        # Category page fallback (always run — catches recent additions)
        sem = asyncio.Semaphore(3)

        async def _scrape_category(cat_slug: str) -> Set[str]:
            cat_found: Set[str] = set()
            for page in range(1, 6):
                page_qs = f"?per_page=50&page={page}" if page > 1 else "?per_page=50"
                url = f"https://www.rokomari.com/book/category/{cat_slug}{page_qs}"
                async with sem:
                    text = await _fetch_text(client, url)
                if not text:
                    break
                soup = BeautifulSoup(text, "html.parser")
                batch: Set[str] = set()
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if not href.startswith("http"):
                        href = "https://www.rokomari.com" + href
                    if _ROKO_PRODUCT_RE.match(href):
                        batch.add(href)
                if not batch:
                    break
                cat_found.update(batch)
                await asyncio.sleep(random.uniform(0.5, 1.5))
            return cat_found

        batches = await asyncio.gather(*[_scrape_category(c) for c in ROKOMARI_CATEGORIES])
        for batch in batches:
            found.update(batch)

    seeded = await _seed_db(found, "rokomari", _roko_extract_id)
    log.info("Rokomari: seeded %d new (found %d URLs)", seeded, len(found))
    return seeded


# ── Pickaboo ──────────────────────────────────────────────────────────────────
# React SPA — sitemaps only (no server-rendered category pages).
# URL format: https://www.pickaboo.com/product/{slug}

_PICK_PRODUCT_RE = re.compile(
    r"https?://(?:www\.)?pickaboo\.com/(?:product|detail)/[^\"'<>\s/]+",
    re.IGNORECASE,
)
_PICK_ID_RE = re.compile(r"/(?:product|detail)/([^/?#\s]+)")


def _pick_extract_id(url: str) -> Optional[str]:
    m = _PICK_ID_RE.search(url)
    return m.group(1) if m else None


async def harvest_pickaboo() -> int:
    found: Set[str] = set()
    log.info("Pickaboo: starting harvest...")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for sitemap_url in [
            "https://www.pickaboo.com/sitemap.xml",
            "https://www.pickaboo.com/sitemap_index.xml",
            "https://www.pickaboo.com/product-sitemap.xml",
        ]:
            urls = await _collect_from_sitemap(client, sitemap_url, _PICK_PRODUCT_RE)
            if urls:
                found.update(urls)
                log.info("Pickaboo: %d URLs from %s", len(urls), sitemap_url)
                break

    seeded = await _seed_db(found, "pickaboo", _pick_extract_id)
    log.info("Pickaboo: seeded %d new (found %d URLs)", seeded, len(found))
    return seeded


# ── Cartup ────────────────────────────────────────────────────────────────────
# React SPA — sitemaps only.
# URL format: https://www.cartup.com.bd/products/{slug}

_CARTUP_PRODUCT_RE = re.compile(
    r"https?://(?:www\.)?cartup\.com\.bd/products?/[^\"'<>\s/]+",
    re.IGNORECASE,
)
_CARTUP_ID_RE = re.compile(r"/products?/([^/?#\s]+)")


def _cartup_extract_id(url: str) -> Optional[str]:
    m = _CARTUP_ID_RE.search(url)
    return m.group(1) if m else None


async def harvest_cartup() -> int:
    # cartup.com.bd DNS is currently dead — skip to avoid CI timeouts
    log.info("Cartup: domain unreachable — skipping harvest.")
    return 0


# ── Chaldal ───────────────────────────────────────────────────────────────────
# React SPA — sitemaps only.
# URL format: https://chaldal.com/{product-slug} (slug-only, no numeric ID in path)

_CHALDAL_PRODUCT_RE = re.compile(
    r"https?://(?:www\.)?chaldal\.com/[A-Za-z0-9][^\"'<>\s]*",
    re.IGNORECASE,
)
# Pages to exclude by path prefix
_CHALDAL_EXCLUDE_RE = re.compile(
    r"chaldal\.com/(?:category|blog|faq|about|careers|contact|terms|privacy|help"
    r"|refer|app|delivery|login|register|account|checkout|cart|search|offer)",
    re.IGNORECASE,
)
_CHALDAL_NUMERIC_ID_RE = re.compile(r"/p/(\d+)")


def _chaldal_extract_id(url: str) -> Optional[str]:
    # Some pages have /p/{id}
    m = _CHALDAL_NUMERIC_ID_RE.search(url)
    if m:
        return m.group(1)
    # Otherwise use the slug (last path segment, no query string)
    path = url.split("?")[0].rstrip("/").split("/")
    slug = path[-1] if path else ""
    return slug if slug and len(slug) > 1 else None


async def harvest_chaldal() -> int:
    found: Set[str] = set()
    log.info("Chaldal: starting harvest...")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for sitemap_url in [
            "https://chaldal.com/sitemap.xml",
            "https://www.chaldal.com/sitemap.xml",
            "https://chaldal.com/sitemap_index.xml",
        ]:
            urls = await _collect_from_sitemap(client, sitemap_url, _CHALDAL_PRODUCT_RE)
            # Filter out non-product pages
            urls = {u for u in urls if not _CHALDAL_EXCLUDE_RE.search(u)}
            if urls:
                found.update(urls)
                log.info("Chaldal: %d URLs from %s", len(urls), sitemap_url)
                break

    seeded = await _seed_db(found, "chaldal", _chaldal_extract_id)
    log.info("Chaldal: seeded %d new (found %d URLs)", seeded, len(found))
    return seeded


# ── Othoba ────────────────────────────────────────────────────────────────────
# React / NopCommerce — sitemaps only.
# URL format: https://www.othoba.com/{product-slug}

_OTHOBA_PRODUCT_RE = re.compile(
    r"https?://(?:www\.)?othoba\.com/[A-Za-z0-9][^\"'<>\s]*",
    re.IGNORECASE,
)
_OTHOBA_EXCLUDE_RE = re.compile(
    r"othoba\.com/(?:category|categories|blog|contact|about|page|tag|checkout|cart"
    r"|login|register|account|compare|wishlist|vendor|search|brands?|manufacturer)",
    re.IGNORECASE,
)


def _othoba_extract_id(url: str) -> Optional[str]:
    path = url.split("?")[0].rstrip("/").split("/")
    slug = path[-1] if path else ""
    return slug if slug and len(slug) > 1 else None


async def harvest_othoba() -> int:
    found: Set[str] = set()
    log.info("Othoba: starting harvest...")

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for sitemap_url in [
            "https://www.othoba.com/sitemap.xml",
            "https://othoba.com/sitemap.xml",
            "https://www.othoba.com/sitemap_index.xml",
        ]:
            urls = await _collect_from_sitemap(client, sitemap_url, _OTHOBA_PRODUCT_RE)
            urls = {u for u in urls if not _OTHOBA_EXCLUDE_RE.search(u)}
            if urls:
                found.update(urls)
                log.info("Othoba: %d URLs from %s", len(urls), sitemap_url)
                break

    seeded = await _seed_db(found, "othoba", _othoba_extract_id)
    log.info("Othoba: seeded %d new (found %d URLs)", seeded, len(found))
    return seeded


# ── Run all ───────────────────────────────────────────────────────────────────

PLATFORM_HARVESTERS: dict[str, Callable] = {
    "rokomari": harvest_rokomari,
    "pickaboo": harvest_pickaboo,
    "cartup": harvest_cartup,
    "chaldal": harvest_chaldal,
    "othoba": harvest_othoba,
}


async def harvest_all_platforms() -> dict[str, int]:
    """
    Run all non-Daraz platform harvesters in parallel.
    Skips platforms not listed in ENABLED_PLATFORMS env var.
    """
    from app.services.flags import is_platform_enabled

    to_run = {p: fn for p, fn in PLATFORM_HARVESTERS.items() if is_platform_enabled(p)}
    if not to_run:
        log.info("No non-Daraz platforms enabled — skipping.")
        return {}

    log.info("Platform harvesters: running for %s", list(to_run.keys()))
    results = await asyncio.gather(*[fn() for fn in to_run.values()], return_exceptions=True)

    totals: dict[str, int] = {}
    for platform, result in zip(to_run.keys(), results):
        if isinstance(result, Exception):
            log.error("Harvest failed for %s: %s", platform, result, exc_info=result)
            totals[platform] = 0
        else:
            totals[platform] = result  # type: ignore[assignment]

    log.info("Platform harvest totals: %s", totals)
    return totals
