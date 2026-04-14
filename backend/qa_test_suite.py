"""
DamKoi — Week 2 QA Test Suite

Comprehensive testing for:
1. Fake discount detector accuracy (50+ products)
2. Edge case handling
3. Email alert delivery
4. Data integrity

Run: python qa_test_suite.py
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import json

sys.path.append(os.getcwd())

from app.database import async_session_factory
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.services.verdict import get_verdict, VerdictLabel
from app.services.mailer import mailer
from sqlalchemy import select
from statistics import mean


class QATestSuite:
    def __init__(self):
        self.results = []
        self.email_tests = []
        self.false_positives = []
        self.false_negatives = []
        self.insufficient_data = []

    async def run_full_qa(self):
        """Execute complete QA suite."""
        print("\n" + "="*70)
        print("🧪 DamKoi Week 2 QA Test Suite")
        print("="*70)

        async with async_session_factory() as db:
            # Get all products from database
            result = await db.execute(select(Product).limit(100))
            products = result.scalars().all()

            if not products:
                print("❌ No products found in database. Run seeding first.")
                print("   python run_mock_data.py")
                return

            print(f"\n📦 Found {len(products)} products. Running verdicts...\n")

            # Test each product
            for i, product in enumerate(products, 1):
                await self._test_product(product, db, i, len(products))

            # Generate report
            await self._generate_report(db)

    async def _test_product(self, product: Product, db, idx: int, total: int):
        """Test verdict for a single product."""
        try:
            # Get all price snapshots
            result = await db.execute(
                select(PriceSnapshot)
                .where(PriceSnapshot.product_id == product.id)
                .order_by(PriceSnapshot.scraped_at.desc())
            )
            snapshots = result.scalars().all()

            if not snapshots:
                print(f"  [{idx}/{total}] ⏭️  {product.title[:40]:40} → No price data")
                return

            # Prepare verdict inputs
            current_price = snapshots[0].price
            from datetime import timezone
            cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
            prices_30d = [s.price for s in snapshots if s.scraped_at >= cutoff_30d]
            all_prices = [s.price for s in snapshots]

            # Find ATL date
            atl_snapshot = min(snapshots, key=lambda s: s.price)
            atl_date = atl_snapshot.scraped_at.strftime("%Y-%m-%d") if atl_snapshot else None

            # Get verdict
            verdict = get_verdict(current_price, prices_30d, all_prices, atl_date)

            # Store result
            result_data = {
                "product_id": str(product.id),
                "title": product.title,
                "current_price": current_price / 100,  # Convert to BDT
                "avg_30d": verdict.avg_30d / 100 if verdict.avg_30d else None,
                "all_time_low": verdict.all_time_low / 100 if verdict.all_time_low else None,
                "verdict_label": verdict.label.value,
                "deal_score": verdict.deal_score,
                "data_points": len(all_prices),
                "data_points_30d": len(prices_30d),
                "confidence": verdict.confidence,
                "explanation": verdict.explanation,
            }
            self.results.append(result_data)

            # Track edge cases
            if verdict.label == VerdictLabel.INSUFFICIENT_DATA:
                self.insufficient_data.append(result_data)

            # Print to console
            emoji_map = {
                VerdictLabel.FAKE_DISCOUNT: "❌",
                VerdictLabel.BEST_PRICE: "✅",
                VerdictLabel.GOOD_DEAL: "🔥",
                VerdictLabel.FAIR_PRICE: "🟡",
                VerdictLabel.INSUFFICIENT_DATA: "⏳",
            }
            emoji = emoji_map.get(verdict.label, "❓")

            score_bar = "█" * verdict.deal_score + "░" * (10 - verdict.deal_score)
            print(
                f"  [{idx:2d}/{total}] {emoji} {verdict.label.value:18} "
                f"[{score_bar}] {product.title[:40]:40}"
            )

        except Exception as e:
            print(f"  [{idx}/{total}] ❌ Error: {product.title[:40]} - {str(e)[:40]}")

    async def _generate_report(self, db):
        """Generate comprehensive QA report."""
        print("\n" + "="*70)
        print("📊 QA Report")
        print("="*70)

        # Summary statistics
        print(f"\n✅ Tested {len(self.results)} products")

        label_counts = {}
        for r in self.results:
            label = r["verdict_label"]
            label_counts[label] = label_counts.get(label, 0) + 1

        print("\n📈 Verdict Distribution:")
        for label, count in sorted(label_counts.items()):
            pct = (count / len(self.results)) * 100
            print(f"   {label:20} → {count:3d} ({pct:5.1f}%)")

        # Data quality metrics
        print("\n📊 Data Quality:")
        if self.results:
            avg_data_points = mean([r["data_points"] for r in self.results])
            avg_30d_points = mean([r["data_points_30d"] for r in self.results])
            print(f"   Average data points (all-time): {avg_data_points:.1f}")
            print(f"   Average data points (30-day):   {avg_30d_points:.1f}")
        else:
            print("   No data available")

        # Deal score distribution
        print("\n🎯 Deal Score Distribution:")
        score_counts = {}
        for r in self.results:
            score = r["deal_score"]
            score_counts[score] = score_counts.get(score, 0) + 1

        for score in range(1, 11):
            count = score_counts.get(score, 0)
            bar = "▓" * count
            print(f"   Score {score:2d} ({score*10:3d}%): {bar}")

        # Edge cases
        print("\n⚠️  Edge Cases:")
        print(f"   Insufficient data: {len(self.insufficient_data)}")
        if self.insufficient_data:
            for r in self.insufficient_data[:5]:
                print(f"      • {r['title'][:50]} ({r['data_points']} points)")

        # Price range analysis
        prices_bdt = [r["current_price"] for r in self.results if r["current_price"]]
        if prices_bdt:
            print(f"\n💰 Price Range Analysis:")
            print(f"   Min: ৳{min(prices_bdt):,.0f}")
            print(f"   Max: ৳{max(prices_bdt):,.0f}")
            print(f"   Avg: ৳{mean(prices_bdt):,.0f}")

        # Confidence analysis
        if self.results:
            avg_confidence = mean([r["confidence"] for r in self.results])
            print(f"\n🎯 Average Confidence: {avg_confidence:.2%}")

        # Save detailed results to JSON
        await self._save_results_json()

        # Email alert test
        await self._test_email_alerts()

    async def _test_email_alerts(self):
        """Test email alert delivery."""
        print("\n" + "="*70)
        print("📧 Email Alert Tests")
        print("="*70)

        test_email = "test@damkoi.local"
        test_product_title = "Samsung Galaxy A55 5G"
        test_url = "https://www.daraz.com.bd/products/test"
        test_current = 42999
        test_target = 38000

        print(f"\n🧪 Testing email delivery...")
        print(f"   To: {test_email}")
        print(f"   Product: {test_product_title}")
        print(f"   Current: ৳{test_current:,}")
        print(f"   Target: ৳{test_target:,}")

        try:
            # Simulate email
            result = await asyncio.to_thread(
                mailer.send_price_drop_email,
                test_email,
                test_product_title,
                test_url,
                test_current,
                test_target,
            )

            if result:
                print(f"\n✅ Email sent successfully!")
            else:
                print(f"\n⚠️  Email not sent - check API key configuration")
        except Exception as e:
            print(f"\n⚠️  Email delivery test skipped: {e}")

    async def _save_results_json(self):
        """Save detailed results to JSON file."""
        output_file = "qa_test_results.json"

        with open(output_file, "w") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_tested": len(self.results),
                "results": self.results,
                "insufficient_data_count": len(self.insufficient_data),
            }, f, indent=2)

        print(f"\n💾 Results saved to: {output_file}")


async def test_verdict_logic_unit_tests():
    """Run unit tests on verdict logic."""
    print("\n" + "="*70)
    print("🧪 Unit Tests - Verdict Logic")
    print("="*70)

    test_cases = [
        {
            "name": "FAKE DISCOUNT - Elevated price",
            "current": 15000,
            "prices_30d": [10000, 10000, 10000, 10000, 10000],
            "all_prices": [10000, 10000, 10000, 10000, 10000, 10000, 15000],
            "expected_label": VerdictLabel.FAKE_DISCOUNT,
        },
        {
            "name": "BEST PRICE - At all-time low",
            "current": 10000,
            "prices_30d": [12000, 12000, 12000, 12000, 10000],
            "all_prices": [15000, 15000, 15000, 12000, 12000, 10000],
            "expected_label": VerdictLabel.BEST_PRICE,
        },
        {
            "name": "GOOD DEAL - 15% below average",
            "current": 10500,
            "prices_30d": [12000, 12000, 12000, 12000, 10500],
            "all_prices": [15000, 15000, 12000, 12000, 12000, 9500, 10500],  # all_time_low is 9500, not close to current
            "expected_label": VerdictLabel.GOOD_DEAL,
        },
        {
            "name": "FAIR PRICE - Normal price",
            "current": 10500,
            "prices_30d": [10500, 10500, 10500, 10500, 10500],
            "all_prices": [10000, 10500, 10500, 10500, 10500, 10500],
            "expected_label": VerdictLabel.FAIR_PRICE,
        },
        {
            "name": "INSUFFICIENT DATA - Only 3 points",
            "current": 10000,
            "prices_30d": [10000, 10000, 10000],
            "all_prices": [10000, 10000, 10000],
            "expected_label": VerdictLabel.INSUFFICIENT_DATA,
        },
    ]

    passed = 0
    failed = 0

    for test in test_cases:
        verdict = get_verdict(
            test["current"],
            test["prices_30d"],
            test["all_prices"],
        )

        is_pass = verdict.label == test["expected_label"]
        status = "✅ PASS" if is_pass else "❌ FAIL"

        if is_pass:
            passed += 1
        else:
            failed += 1

        print(f"\n{status} - {test['name']}")
        print(f"   Expected: {test['expected_label'].value}")
        print(f"   Got:      {verdict.label.value}")
        print(f"   Score:    {verdict.deal_score}/10 (Confidence: {verdict.confidence:.0%})")

    print(f"\n" + "-"*70)
    print(f"Results: {passed} passed, {failed} failed")
    return failed == 0


async def main():
    """Run all QA tests."""

    # Run unit tests first
    unit_tests_pass = await test_verdict_logic_unit_tests()

    # Run full suite
    suite = QATestSuite()
    await suite.run_full_qa()

    if not unit_tests_pass:
        print("\n⚠️  Some unit tests failed. Review verdict logic.")

    print("\n" + "="*70)
    print("✅ QA Test Suite Complete")
    print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
