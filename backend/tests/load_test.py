"""
DamKoi — Ops Load Testing

A simple asynchronous load tester to stress-test the DamKoi API endpoints.
Run this locally before deploying major changes to ensure the FastAPI app
and database connection pool can handle sudden spikes in traffic.
"""

import asyncio
import time
import aiohttp

API_URL = "http://localhost:8000/v1"
CONCURRENCY = 100
TOTAL_REQUESTS = 1000

async def fetch(session, url):
    start = time.monotonic()
    try:
        async with session.get(url) as response:
            await response.read()
            return response.status, time.monotonic() - start
    except Exception as e:
        return 0, time.monotonic() - start

async def load_test():
    print(f"Starting load test on {API_URL}")
    print(f"Concurrency: {CONCURRENCY}, Total Requests: {TOTAL_REQUESTS}")
    
    # We will test the compare API for a random UUID
    # In a real scenario, use actual UUIDs from the DB
    test_url = f"{API_URL}/products/00000000-0000-0000-0000-000000000000/compare"
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for _ in range(TOTAL_REQUESTS):
            tasks.append(fetch(session, test_url))
        
        start_time = time.time()
        
        # Run with concurrency limit
        semaphore = asyncio.Semaphore(CONCURRENCY)
        async def sem_task(t):
            async with semaphore:
                return await t
                
        results = await asyncio.gather(*(sem_task(t) for t in tasks))
        end_time = time.time()
        
        successes = len([r for r in results if r[0] == 200])
        failures = len([r for r in results if r[0] != 200])
        total_time = end_time - start_time
        avg_time = sum(r[1] for r in results) / len(results)
        
        print("\n--- Load Test Results ---")
        print(f"Total time taken: {total_time:.2f} seconds")
        print(f"Requests per second: {TOTAL_REQUESTS / total_time:.2f}")
        print(f"Average latency: {avg_time * 1000:.2f} ms")
        print(f"Success: {successes}")
        print(f"Failures (4xx/5xx/Network): {failures}")

if __name__ == "__main__":
    asyncio.run(load_test())
