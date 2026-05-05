"""
DamKoi — Fake Discount Detector (Verdict Engine)

The flagship feature. Determines whether a product's current discount is real
or inflated by comparing against historical price data.

Logic from PRD Section 6.2, with additional edge case handling.
"""

from dataclasses import dataclass
from enum import Enum
from statistics import mean
from typing import List, Optional


class VerdictLabel(str, Enum):
    """Possible verdict outcomes."""
    FAKE_DISCOUNT = "FAKE_DISCOUNT"
    BEST_PRICE = "BEST_PRICE"
    GOOD_DEAL = "GOOD_DEAL"
    FAIR_PRICE = "FAIR_PRICE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


@dataclass
class Verdict:
    """The complete verdict for a product's current price."""
    label: VerdictLabel
    deal_score: int  # 1-10
    display: str  # e.g., "FAKE DISCOUNT"
    explanation: str  # human-readable reason
    current_price: int  # in paisa
    avg_30d: Optional[int]  # in paisa
    all_time_low: Optional[int]  # in paisa
    all_time_low_date: Optional[str]  # ISO date
    data_points: int
    confidence: float  # 0.0–1.0


# -- Display templates ------------------------------------------------

VERDICT_DISPLAY = {
    VerdictLabel.FAKE_DISCOUNT:     "FAKE DISCOUNT",
    VerdictLabel.BEST_PRICE:        "BEST PRICE -- ALL-TIME LOW",
    VerdictLabel.GOOD_DEAL:         "GOOD DEAL",
    VerdictLabel.FAIR_PRICE:        "FAIR PRICE",
    VerdictLabel.INSUFFICIENT_DATA: "TRACKING -- NOT ENOUGH DATA YET",
}

VERDICT_DISPLAY_BN = {
    VerdictLabel.FAKE_DISCOUNT:     "ভুয়া ছাড়",
    VerdictLabel.BEST_PRICE:        "সর্বনিম্ন দাম",
    VerdictLabel.GOOD_DEAL:         "ভাল ডিল",
    VerdictLabel.FAIR_PRICE:        "স্বাভাবিক দাম",
    VerdictLabel.INSUFFICIENT_DATA: "তথ্য সংগ্রহ হচ্ছে",
}


def _format_price_bdt(paisa: int) -> str:
    """Format paisa amount as BDT string with commas."""
    bdt = paisa / 100
    if bdt == int(bdt):
        return f"৳{int(bdt):,}"
    return f"৳{bdt:,.2f}"


def get_verdict(
    current_price: int,
    prices_last_30_days: List[int],
    all_prices_ever: List[int],
    all_time_low_date: Optional[str] = None,
    lang: str = "en",
) -> Verdict:
    """
    Determine whether the current price represents a real deal.

    Args:
        current_price: Current price in paisa
        prices_last_30_days: List of prices (paisa) observed in last 30 days
        all_prices_ever: List of all prices (paisa) ever recorded
        all_time_low_date: ISO date string of when all-time low was seen
        lang: Language code ("en" or "bn")

    Returns:
        Verdict object with label, score, and explanation
    """
    display_map = VERDICT_DISPLAY_BN if lang == "bn" else VERDICT_DISPLAY
    data_points = len(all_prices_ever)

    # ── Insufficient data check ───────────────────────────────
    if len(prices_last_30_days) < 5:
        if lang == "bn":
            insufficient_explanation = (
                f"আমরা এই পণ্যটি মাত্র {data_points} বার ট্র্যাক করেছি। "
                "নির্ভরযোগ্য বিশ্লেষণের জন্য ১৪ দিনে কমপক্ষে ৫টি মূল্য পয়েন্ট প্রয়োজন।"
            )
        else:
            insufficient_explanation = (
                f"We've only tracked this product {data_points} time(s). "
                "We need at least 5 price points over 14 days to give a reliable verdict."
            )
        return Verdict(
            label=VerdictLabel.INSUFFICIENT_DATA,
            deal_score=5,  # neutral score when we can't judge
            display=display_map[VerdictLabel.INSUFFICIENT_DATA],
            explanation=insufficient_explanation,
            current_price=current_price,
            avg_30d=None,
            all_time_low=None,
            all_time_low_date=None,
            data_points=data_points,
            confidence=0.0,
        )

    avg_30d = int(mean(prices_last_30_days))
    all_time_low = min(all_prices_ever)

    # ── Core verdict logic (from PRD) ─────────────────────────
    discount_from_avg = (avg_30d - current_price) / avg_30d if avg_30d > 0 else 0.0

    if current_price > avg_30d * 1.05:
        label = VerdictLabel.FAKE_DISCOUNT
        overpay = current_price - avg_30d
        if lang == "bn":
            explanation = (
                f"দামটি ৩০ দিনের গড়ের ({_format_price_bdt(avg_30d)}) চেয়ে "
                f"{_format_price_bdt(overpay)} বেশি। এখন কেনার সঠিক সময় নয়।"
            )
        else:
            explanation = (
                f"Price is {_format_price_bdt(overpay)} ABOVE the 30-day average "
                f"({_format_price_bdt(avg_30d)}). This is NOT a good time to buy."
            )
    elif current_price <= all_time_low * 1.02:
        label = VerdictLabel.BEST_PRICE
        if lang == "bn":
            explanation = (
                f"এটি আমাদের ট্র্যাক করা সর্বনিম্ন দাম! "
                f"সর্বকালীন সর্বনিম্ন: {_format_price_bdt(all_time_low)}।"
            )
        else:
            explanation = (
                f"This is the lowest price we've ever tracked! "
                f"All-time low: {_format_price_bdt(all_time_low)}."
            )
    elif discount_from_avg >= 0.10:
        label = VerdictLabel.GOOD_DEAL
        pct = int(discount_from_avg * 100)
        if lang == "bn":
            explanation = (
                f"দামটি ৩০ দিনের গড় ({_format_price_bdt(avg_30d)}) এর চেয়ে {pct}% কম। "
                f"এটি একটি ভালো সুযোগ।"
            )
        else:
            explanation = (
                f"Price is {pct}% below the 30-day average ({_format_price_bdt(avg_30d)}). "
                f"One of the better prices we've seen."
            )
    elif discount_from_avg >= 0.00:
        label = VerdictLabel.FAIR_PRICE
        if lang == "bn":
            explanation = (
                f"দামটি স্বাভাবিক, এখন কোনো বিশেষ ছাড় নেই। "
                f"৩০ দিনের গড়: {_format_price_bdt(avg_30d)}।"
            )
        else:
            explanation = (
                f"Price is normal. No special deal right now. "
                f"30-day average: {_format_price_bdt(avg_30d)}."
            )
    else:
        label = VerdictLabel.FAKE_DISCOUNT
        overpay = current_price - avg_30d
        if lang == "bn":
            explanation = (
                f"দামটি ৩০ দিনের গড় ({_format_price_bdt(avg_30d)}) এর চেয়ে "
                f"{_format_price_bdt(abs(overpay))} বেশি। দেখানো ছাড়টি বিভ্রান্তিকর।"
            )
        else:
            explanation = (
                f"Price is {_format_price_bdt(abs(overpay))} above the 30-day average "
                f"({_format_price_bdt(avg_30d)}). The displayed discount is misleading."
            )

    # ── Calculate deal score (1–10) ───────────────────────────
    deal_score = _calculate_deal_score(current_price, avg_30d, all_time_low, discount_from_avg)

    # ── Confidence based on data density ──────────────────────
    confidence = min(data_points / 30, 1.0)  # max confidence at 30+ data points

    return Verdict(
        label=label,
        deal_score=deal_score,
        display=display_map[label],
        explanation=explanation,
        current_price=current_price,
        avg_30d=avg_30d,
        all_time_low=all_time_low,
        all_time_low_date=all_time_low_date,
        data_points=data_points,
        confidence=confidence,
    )


def _calculate_deal_score(
    current_price: int,
    avg_30d: int,
    all_time_low: int,
    discount_from_avg: float,
) -> int:
    """
    Calculate deal score from 1 to 10.

    Score mapping from PRD:
        9–10: All-time low or very close
        7–8:  Genuinely below average
        5–6:  Normal / fair price
        3–4:  Slightly elevated
        1–2:  Clearly fake / inflated discount
    """
    # Distance from all-time low (0 = at ATL, 1 = far from ATL)
    if all_time_low > 0:
        distance_from_atl = (current_price - all_time_low) / all_time_low
    else:
        distance_from_atl = 0.0

    # At or near all-time low
    if distance_from_atl <= 0.02:
        return 10
    elif distance_from_atl <= 0.05:
        return 9

    # Genuinely below average
    if discount_from_avg >= 0.20:
        return 8
    elif discount_from_avg >= 0.10:
        return 7

    # Normal / fair price
    if discount_from_avg >= 0.02:
        return 6
    elif discount_from_avg >= -0.02:
        return 5

    # Slightly elevated
    if discount_from_avg >= -0.10:
        return 4
    elif discount_from_avg >= -0.15:
        return 3

    # Clearly elevated / fake
    if discount_from_avg >= -0.25:
        return 2
    else:
        return 1
