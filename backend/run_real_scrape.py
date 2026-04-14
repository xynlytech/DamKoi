import asyncio
import sys
import os

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import async_session_factory
from app.scraper.daraz_scraper import DarazScraper
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from sqlalchemy import select

async def main():
    print("🚀 Running Real Stealth Scrape on Seeded URLs...")
    
    # Load 3 URLs from seeded_urls.txt
    try:
        with open("seeded_urls.txt", "r") as f:
            urls = [line.strip() for line in f.readlines()[:3]]
    except FileNotFoundError:
        print("❌ seeded_urls.txt not found. Run seed.py first.")
        return

    if not urls:
        print("❌ No URLs found in seeded_urls.txt")
        return

    async with DarazScraper(headless=True) as scraper:
        results = await scraper.scrape_batch(urls)
        
        if not results:
            print("❌ All scrapes failed. Akamai might still be blocking us or the stealth plugin failed.")
            return

        async with async_session_factory() as db:
            for item in results:
                # Check if product exists
                stmt = select(Product).where(Product.external_id == item.external_id)
                res = await db.execute(stmt)
                db_product = res.scalar_one_or_none()
                
                if not db_product:
                    db_product = Product(
                        external_id=item.external_id,
                        platform="daraz",
                        url=item.url,
                        title=item.title,
                        brand=item.brand,
                        category=item.category,
                        image_url=item.image_url
                    )
                    db.add(db_product)
                    await db.flush()
                
                # Add price snapshot
                snapshot = PriceSnapshot(
                    product_id=db_product.id,
                    price=item.price,
                    original_price=item.original_price,
                    discount_pct=item.discount_pct,
                    in_stock=item.in_stock,
                    scraped_at=item.scraped_at
                )
                db.add(snapshot)
                print(f"✅ Persisted to Supabase: {item.title[:40]}... at ৳{item.price/100:,.2f}")
            
            await db.commit()
            print(f"\n🎉 Successfully persisted {len(results)} real products to Supabase!")

if __name__ == "__main__":
    asyncio.run(main())
