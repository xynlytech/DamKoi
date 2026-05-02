"""
DamKoi — AI Service Layer

Provides abstractions for LLM interactions (e.g., Anthropic Claude).
For the MVP, this returns deterministic mock summaries based on product titles.
"""

import asyncio
from typing import Dict, List, Any

class AIService:
    @staticmethod
    async def generate_product_lens(title: str, price: int) -> Dict[str, Any]:
        """
        Generate a Product Lens summary (Pros, Cons, Verdict).
        MVP: Mock implementation based on keywords.
        """
        # Simulate LLM latency
        await asyncio.sleep(1.5)
        
        t_lower = title.lower()
        
        if "samsung" in t_lower or "iphone" in t_lower or "phone" in t_lower or "xiaomi" in t_lower:
            return {
                "pros": [
                    "High-quality display and build",
                    "Strong performance for the price bracket",
                    "Good resale value in the BD market"
                ],
                "cons": [
                    "Battery life could be better under heavy load",
                    "Included accessories are minimal"
                ],
                "verdict": "A solid smartphone choice. If the current price is within 5% of the all-time low, it's a strong buy. Otherwise, wait for the next platform campaign."
            }
        elif "laptop" in t_lower or "macbook" in t_lower or "asus" in t_lower:
            return {
                "pros": [
                    "Excellent processor performance",
                    "Good keyboard travel and build quality"
                ],
                "cons": [
                    "Thermal throttling under sustained workloads",
                    "Display color accuracy is average"
                ],
                "verdict": "Great for productivity and moderate workloads. Ensure warranty coverage is official before purchasing."
            }
        elif "rice" in t_lower or "oil" in t_lower or "dal" in t_lower:
            return {
                "pros": [
                    "Essential daily commodity",
                    "Bulk buying offers better value"
                ],
                "cons": [
                    "Prices fluctuate frequently based on supply"
                ],
                "verdict": "Standard grocery item. Compare the per-kg price with local offline markets before committing to an online order."
            }
        else:
            return {
                "pros": [
                    "Generally well-reviewed by buyers",
                    "Reasonable value at current price point"
                ],
                "cons": [
                    "Limited long-term durability data",
                    "Delivery times can vary by platform"
                ],
                "verdict": "A reasonable purchase if you need it immediately. If not urgent, set a DamKoi price alert to catch the next 10-15% drop."
            }
