import asyncio
import os
import sys

import asyncpg

REGIONS = [
    "us-east-1", "us-west-1", "us-west-2", "eu-west-1", "eu-west-2",
    "eu-west-3", "eu-central-1", "ap-southeast-1", "ap-northeast-1",
    "ap-northeast-2", "ap-south-1", "sa-east-1", "ap-southeast-2"
]

# Never hardcode credentials — read from the environment.
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")
PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")
if not PROJECT_REF or not PASSWORD:
    sys.exit("Set SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD env vars.")

async def test_region(region):
    # Try both 5432 and 6543 pooler ports
    for port in [6543, 5432]:
        url = f"postgresql://postgres.{PROJECT_REF}:{PASSWORD}@aws-0-{region}.pooler.supabase.com:{port}/postgres"
        try:
            conn = await asyncio.wait_for(asyncpg.connect(url), timeout=3.0)
            print(f"SUCCESS: {url}")
            await conn.close()
            return url
        except Exception:
            pass
    return None

async def main():
    print("Brute-forcing Supabase pooler regions...")
    tasks = [test_region(r) for r in REGIONS]
    results = await asyncio.gather(*tasks)
    
    for res in results:
        if res:
            with open(".env.found", "w") as f:
                f.write(res)
            return
    print("FAILED TO FIND REGION")

if __name__ == "__main__":
    asyncio.run(main())
