import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.product import Product

async def main():
    async with async_session_factory() as db:
        result = await db.execute(select(Product).limit(5))
        for p in result.scalars():
            print(f"Title: {p.title}")
            print(f"URL: {p.url}")
            print("---")

if __name__ == "__main__":
    asyncio.run(main())
