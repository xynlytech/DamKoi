"""Read-only mtop probe. Pulls a few real Daraz URLs from the DB and runs the
live scrape path (scrape_batch_http) WITHOUT saving. Proves whether the scraper
currently extracts discounted prices. Run: python probe_mtop.py [N]
"""
import asyncio
import sys
import asyncpg

from app.config import settings
from app.scraper.daraz_http import scrape_batch_http, _ids_from_url


def _raw(url: str) -> str:
    return (url.replace("postgresql+asyncpg://", "postgresql://", 1)
               .replace("postgres://", "postgresql://", 1))


async def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    order = "DESC" if (len(sys.argv) > 2 and sys.argv[2] == "fresh") else "ASC"
    conn = await asyncpg.connect(_raw(settings.DATABASE_URL), statement_cache_size=0)
    rows = await conn.fetch(
        f"""SELECT url FROM products
           WHERE platform='daraz' AND is_active AND last_scraped_at IS NOT NULL
           ORDER BY last_scraped_at {order} LIMIT $1""", n)
    await conn.close()
    urls = [r["url"] for r in rows]

    with_s = sum(1 for u in urls if _ids_from_url(u))
    print(f"sampled {len(urls)} urls; {with_s}/{len(urls)} have -s skuId (mtop-eligible)")
    for u in urls[:3]:
        print(f"  url: {u}")

    scraped = await scrape_batch_http(urls, concurrency=4)
    print("=" * 64)
    print(f"  scrape_batch_http yield = {len(scraped)}/{len(urls)}")
    print("-" * 64)
    for s in scraped:
        op = f" (MRP ৳{s.original_price/100:,.0f})" if s.original_price else ""
        print(f"  ৳{s.price/100:>9,.0f}{op}  d={s.discount_pct}  {(s.title or '')[:38]}")
    print("=" * 64)


asyncio.run(main())
