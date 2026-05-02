import asyncio
from sqlalchemy import select, delete
from app.database import async_session_factory
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.models.tracked_product import TrackedProduct

async def main():
    async with async_session_factory() as db:
        print("Cleaning up mock database...")
        # Get products that look like mock data
        result = await db.execute(select(Product).where(Product.title.in_([
            "iPhone 15 Pro Max 256GB Black",
            "Sony PlayStation 5 Digital Edition",
            "Samsung Galaxy S24 Ultra Titanium",
        ]) | Product.title.like("Electronic Gadget%")))
        
        products = result.scalars().all()
        for p in products:
            print(f"Deleting mock product: {p.title}")
            await db.execute(delete(PriceSnapshot).where(PriceSnapshot.product_id == p.id))
            await db.execute(delete(TrackedProduct).where(TrackedProduct.product_id == p.id))
            await db.execute(delete(Product).where(Product.id == p.id))
        
        await db.commit()
        print("Done deleting mock data. You should run run_real_scrape.py to get actual data.")

asyncio.run(main())
