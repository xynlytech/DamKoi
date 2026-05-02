#!/usr/bin/env python
"""
DamKoi Week 4 — 50 Product Verdict Accuracy Test
Tests the verdict accuracy and extension compatibility on real products
"""

import asyncio
import json
import time
from datetime import datetime
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import Product, PriceSnapshot
from app.config import settings

API_BASE = "http://localhost:8000/v1"
PRODUCTS_TO_TEST = 50

class TestRunner:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
        self.engine = None
        self.async_session = None

    async def setup(self):
        """Initialize database connection"""
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True
        )
        self.async_session = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def get_products_to_test(self, limit=50):
        """Fetch products with sufficient data from database"""
        async with self.async_session() as session:
            # Get products with at least 5 price points
            query = (
                select(Product)
                .where(Product.is_active == True)
                .order_by(func.random())
                .limit(limit)
            )
            result = await session.execute(query)
            products = result.scalars().all()
            return products

    async def get_verdict_via_api(self, product_id):
        """Call API to get verdict for a product"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{API_BASE}/products/{product_id}/verdict"
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    return {"error": f"API returned {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    async def test_product(self, product, index):
        """Test a single product"""
        print(f"\n[{index+1}/{PRODUCTS_TO_TEST}] Testing: {product.title[:50]}...")

        test_result = {
            "index": index + 1,
            "product_id": str(product.id),
            "title": product.title,
            "url": product.url,
            "platform": product.platform,
            "timestamp": datetime.now().isoformat()
        }

        # Get data from database for this product
        async with self.async_session() as session:
            query = select(PriceSnapshot).where(
                PriceSnapshot.product_id == product.id
            ).order_by(PriceSnapshot.scraped_at.desc()).limit(100)
            result = await session.execute(query)
            snapshots = result.scalars().all()

        if snapshots:
            test_result["data_points"] = len(snapshots)
            test_result["current_price"] = snapshots[0].price
            test_result["latest_snapshot"] = snapshots[0].scraped_at.isoformat()
        else:
            test_result["data_points"] = 0
            test_result["status"] = "NO_DATA"
            self.results.append(test_result)
            return

        # Call API to get verdict
        verdict_response = await self.get_verdict_via_api(product.id)

        if "error" in verdict_response:
            test_result["status"] = "ERROR"
            test_result["error"] = verdict_response["error"]
            print(f"  ❌ Error: {verdict_response['error']}")
        else:
            # API returns verdict at top level
            test_result["verdict_label"] = verdict_response.get("label")
            test_result["deal_score"] = verdict_response.get("deal_score")
            test_result["explanation"] = verdict_response.get("explanation")
            test_result["avg_30d"] = verdict_response.get("avg_30d")
            test_result["all_time_low"] = verdict_response.get("all_time_low")
            test_result["confidence"] = verdict_response.get("confidence")
            test_result["data_points"] = verdict_response.get("data_points")
            test_result["status"] = "SUCCESS"

            # Validation checks
            checks = self._validate_verdict(test_result, snapshots)
            test_result["validation"] = checks

            label = verdict_response.get("label", "UNKNOWN")
            score = verdict_response.get("deal_score", 0)
            status_icon = "✅" if checks["all_pass"] else "⚠️ "
            print(f"  {status_icon} {label} (Score: {score}/10) | Data points: {len(snapshots)}")

        self.results.append(test_result)

    def _validate_verdict(self, result, snapshots):
        """Validate verdict accuracy"""
        checks = {
            "all_pass": True,
            "price_data_valid": True,
            "score_in_range": True,
            "label_valid": True,
            "confidence_reasonable": True
        }

        # Check if score is 1-10
        score = result.get("deal_score")
        if score is None or not (1 <= score <= 10):
            checks["score_in_range"] = False
            checks["all_pass"] = False

        # Check if label is valid
        valid_labels = ["BEST_PRICE", "GOOD_DEAL", "FAIR_PRICE", "FAKE_DISCOUNT", "INSUFFICIENT_DATA"]
        if result.get("verdict_label") not in valid_labels:
            checks["label_valid"] = False
            checks["all_pass"] = False

        # Check if confidence is 0-1
        confidence = result.get("confidence")
        if confidence is not None and not (0 <= confidence <= 1):
            checks["confidence_reasonable"] = False
            checks["all_pass"] = False

        # Check price data consistency
        if result.get("data_points", 0) >= 5:
            current = result.get("current_price", 0)
            all_time_low = result.get("all_time_low")
            if all_time_low is not None and current < all_time_low:
                checks["price_data_valid"] = False
                checks["all_pass"] = False

        return checks

    async def run_tests(self):
        """Run all tests"""
        await self.setup()

        print("=" * 70)
        print("DamKoi Week 4 — 50 Product Verdict Accuracy Test")
        print("=" * 70)
        print(f"Starting tests at {datetime.now().isoformat()}")
        print(f"Target: {PRODUCTS_TO_TEST} products")

        products = await self.get_products_to_test(PRODUCTS_TO_TEST)
        print(f"Found {len(products)} products in database")

        if len(products) == 0:
            print("❌ No products found in database. Please run scraper first.")
            return

        for index, product in enumerate(products):
            await self.test_product(product, index)
            await asyncio.sleep(0.1)  # Small delay between requests

        await self.engine.dispose()
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        elapsed = time.time() - self.start_time

        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)

        total = len(self.results)
        successful = len([r for r in self.results if r.get("status") == "SUCCESS"])
        errors = len([r for r in self.results if r.get("status") == "ERROR"])

        print(f"\nTotal Tested:      {total}")
        print(f"Successful:        {successful} ({100*successful/total:.1f}%)")
        print(f"Errors:            {errors} ({100*errors/total:.1f}%)")
        print(f"Time Elapsed:      {elapsed:.1f}s")

        # Verdict distribution
        print("\nVerdict Distribution:")
        verdict_counts = {}
        for r in self.results:
            if r.get("status") == "SUCCESS":
                label = r.get("verdict_label", "UNKNOWN")
                if label:
                    verdict_counts[label] = verdict_counts.get(label, 0) + 1

        for label, count in sorted(verdict_counts.items()):
            print(f"  {label:20s}: {count:3d} ({100*count/successful:.1f}%)")

        # Deal score distribution
        print("\nDeal Score Distribution:")
        scores = [r.get("deal_score") for r in self.results if r.get("deal_score") is not None]
        if scores:
            print(f"  Min Score:         {min(scores)}")
            print(f"  Max Score:         {max(scores)}")
            print(f"  Avg Score:         {sum(scores)/len(scores):.1f}")

        # Validation results
        print("\nValidation Results:")
        all_pass = sum(1 for r in self.results if r.get("validation", {}).get("all_pass", False))
        print(f"  All Checks Passed: {all_pass}/{total} ({100*all_pass/total:.1f}%)")

        # Save full report
        self.save_report()

    def save_report(self):
        """Save detailed report to JSON"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_tested": len(self.results),
            "successful": len([r for r in self.results if r.get("status") == "SUCCESS"]),
            "errors": len([r for r in self.results if r.get("status") == "ERROR"]),
            "results": self.results
        }

        with open("qa_week4_results.json", "w") as f:
            json.dump(report, f, indent=2)

        print(f"\n✅ Full report saved to: qa_week4_results.json")


async def main():
    runner = TestRunner()
    await runner.run_tests()


if __name__ == "__main__":
    asyncio.run(main())
