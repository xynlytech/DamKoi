import asyncio
from app.scraper.daraz_scraper import DarazScraper

async def main():
    print("Fetching raw Daraz HTML to debug selectors...")
    scraper = DarazScraper()
    await scraper.start()
    
    page = await scraper._context.new_page()
    await page.goto("https://www.daraz.com.bd/products/realme-c51-4gb64gb-i319694273-s1468165707.html", wait_until="networkidle")
    html = await page.content()
    
    with open("daraz_dump.html", "w") as f:
        f.write(html)
        
    print("Saved to daraz_dump.html")
    await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())
