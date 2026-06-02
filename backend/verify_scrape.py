"""Read-only scrape verification. Run: python verify_scrape.py  (loads DATABASE_URL from env)

Prints: product totals, today's scrape activity, price_history writes, May-31 purge
status, and 5 sample freshly-scraped products with their stored price.
"""
import asyncio
import asyncpg
from datetime import datetime, timezone
from app.config import settings


def _raw(url: str) -> str:
    return (url.replace("postgresql+asyncpg://", "postgresql://", 1)
               .replace("postgres://", "postgresql://", 1))


async def main():
    url = _raw(settings.DATABASE_URL)
    conn = await asyncpg.connect(url, statement_cache_size=0)
    now = datetime.now(timezone.utc)
    midnight = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    epoch_today = int(now.timestamp() // 86400)

    total = await conn.fetchval("SELECT count(*) FROM products")
    with_price = await conn.fetchval("SELECT count(*) FROM products WHERE current_price IS NOT NULL")
    scraped_today = await conn.fetchval(
        "SELECT count(*) FROM products WHERE last_scraped_at >= $1", midnight)
    scraped_1h = await conn.fetchval(
        "SELECT count(*) FROM products WHERE last_scraped_at >= $1",
        now.replace(microsecond=0) - __import__("datetime").timedelta(hours=1))
    last_ts = await conn.fetchval("SELECT max(last_scraped_at) FROM products")

    ph_rows = await conn.fetchval("SELECT count(*) FROM price_history")
    ph_today = await conn.fetchval(
        "SELECT count(*) FROM price_history WHERE updated_at >= $1", midnight)
    pts_today = await conn.fetchval(
        """SELECT count(*) FROM price_history, jsonb_array_elements(series) AS e
           WHERE (e->>0)::int = $1""", epoch_today)
    pts_may31 = await conn.fetchval(
        """SELECT count(*) FROM price_history, jsonb_array_elements(series) AS e
           WHERE (e->>0)::int = 20604""")

    samples = await conn.fetch(
        """SELECT title, current_price, current_original_price, last_scraped_at
           FROM products
           WHERE last_scraped_at >= $1 AND current_price IS NOT NULL
           ORDER BY last_scraped_at DESC LIMIT 5""", midnight)

    print("=" * 64)
    print(f"  epoch_today            = {epoch_today}   (now {now:%Y-%m-%d %H:%M} UTC)")
    print("-" * 64)
    print(f"  products total         = {total:,}")
    print(f"  products w/ price       = {with_price:,}")
    print(f"  scraped today          = {scraped_today:,}")
    print(f"  scraped last 1h        = {scraped_1h:,}")
    print(f"  last_scraped_at (max)  = {last_ts}")
    print("-" * 64)
    print(f"  price_history rows     = {ph_rows:,}")
    print(f"  price_history upd today = {ph_today:,}")
    print(f"  series points today    = {pts_today:,}")
    print(f"  series points May-31   = {pts_may31}   (must be 0 after purge)")
    print("=" * 64)
    print("  sample fresh scrapes (price in paisa; /100 = BDT):")
    if not samples:
        print("    (none scraped today yet)")
    for r in samples:
        t = (r["title"] or "")[:40]
        print(f"    ৳{r['current_price']/100:>9,.0f}  (MRP ৳{(r['current_original_price'] or 0)/100:>9,.0f})  {r['last_scraped_at']:%H:%M}  {t}")
    print("=" * 64)

    await conn.close()


asyncio.run(main())
