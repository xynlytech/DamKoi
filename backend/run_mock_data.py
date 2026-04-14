import asyncio
import sys
import os
import random
from datetime import datetime, timedelta

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import async_session_factory
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from sqlalchemy import select

async def main():
    print("🧪 Running Mock Data Injection (Infrastructure Verification)...")
    
    urls = [
        "https://www.daraz.com.bd/i114982395-s1032884561.html",
        "https://www.daraz.com.bd/i115024178-s1032936420.html",
        "https://www.daraz.com.bd/i115216486-s1033358066.html",
        "https://www.daraz.com.bd/i113214816-s1030392532.html",
        "https://www.daraz.com.bd/i101162237-s1757949620.html",
        "https://www.daraz.com.bd/i609019-s2257310.html"
    ]

    # Mock product metadata generator
    def get_mock_info(url):
        if "i114982395" in url:
            return {"title": "iPhone 15 Pro Max 256GB Black", "brand": "Apple", "cat": "Mobiles", "price": 165000}
        if "i115024178" in url:
            return {"title": "Sony PlayStation 5 Digital Edition", "brand": "Sony", "cat": "Gaming", "price": 58000}
        if "i115216486" in url:
            return {"title": "Samsung Galaxy S24 Ultra Titanium", "brand": "Samsung", "cat": "Mobiles", "price": 145000}
        return {"title": f"Electronic Gadget {random.randint(100,999)}", "brand": "Generic", "cat": "Electronics", "price": random.randint(500, 5000)}

    async with async_session_factory() as db:
        for url in urls:
            info = get_mock_info(url)
            ext_id = url.split("-i")[1].split("-s")[0] if "-i" in url else url.split("i")[-1].split("-")[0]
            
            # 1. Ensure Product exists
            stmt = select(Product).where(Product.external_id == ext_id)
            res = await db.execute(stmt)
            db_product = res.scalar_one_or_none()
            
            if not db_product:
                from app.scraper.daraz_scraper import _normalize_title
                db_product = Product(
                    external_id=ext_id,
                    platform="daraz",
                    url=url,
                    title=info['title'],
                    normalized_title=_normalize_title(info['title']),
                    brand=info['brand'],
                    category=info['cat'],
                    image_url=f"https://dummyimage.com/600x400/222/fff&text={info['brand']}"
                )
                db.add(db_product)
                await db.flush()
            
            # 2. Inject Price History (7 days)
            base_price = info['price'] * 100 # Convert to Paisa
            
            for d in range(7, -1, -1):
                # Simulate some price fluctuation
                daily_price = base_price
                if d == 3: daily_price = int(base_price * 1.1)    # 10% price hike
                if d == 0: daily_price = int(base_price * 0.95)   # 5% current discount
                
                snapshot = PriceSnapshot(
                    product_id=db_product.id,
                    price=daily_price,
                    original_price=int(base_price * 1.1),
                    discount_pct=10 if d == 0 else 0,
                    in_stock=True,
                    scraped_at=datetime.utcnow() - timedelta(days=d)
                )
                db.add(snapshot)
            
            print(f"✅ Injected history for: {info['title'][:30]}")
        
        await db.commit()
        print(f"\n🎉 Successfully seeded {len(urls)} products with price history to Supabase!")

if __name__ == "__main__":
    asyncio.run(main())
