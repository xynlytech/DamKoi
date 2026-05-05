export type VerdictLabel =
  | "FAKE_DISCOUNT"
  | "BEST_PRICE"
  | "GOOD_DEAL"
  | "FAIR_PRICE"
  | "INSUFFICIENT_DATA";

export interface VerdictResult {
  label: VerdictLabel;
  deal_score: number;
  display: string;
  explanation: string;
  current_price: number;
  avg_30d: number | null;
  all_time_low: number | null;
  all_time_low_date: string | null;
  data_points: number;
  confidence: number;
}

function fmt(paisa: number): string {
  const bdt = paisa / 100;
  return `৳${Number.isInteger(bdt) ? bdt.toLocaleString("en-BD") : bdt.toFixed(2)}`;
}

const DISPLAY_EN: Record<VerdictLabel, string> = {
  FAKE_DISCOUNT: "FAKE DISCOUNT",
  BEST_PRICE: "BEST PRICE — ALL-TIME LOW",
  GOOD_DEAL: "GOOD DEAL",
  FAIR_PRICE: "FAIR PRICE",
  INSUFFICIENT_DATA: "TRACKING — NOT ENOUGH DATA YET",
};

const DISPLAY_BN: Record<VerdictLabel, string> = {
  FAKE_DISCOUNT: "ভুয়া ছাড়",
  BEST_PRICE: "সর্বনিম্ন দাম",
  GOOD_DEAL: "ভাল ডিল",
  FAIR_PRICE: "স্বাভাবিক দাম",
  INSUFFICIENT_DATA: "তথ্য সংগ্রহ হচ্ছে",
};

export function getVerdict(
  currentPrice: number,
  prices30d: number[],
  allPrices: number[],
  allTimeLowDate: string | null = null,
  lang: "en" | "bn" = "en"
): VerdictResult {
  const displayMap = lang === "bn" ? DISPLAY_BN : DISPLAY_EN;
  const dataPoints = allPrices.length;

  if (prices30d.length < 5) {
    return {
      label: "INSUFFICIENT_DATA",
      deal_score: 5,
      display: displayMap.INSUFFICIENT_DATA,
      explanation:
        lang === "bn"
          ? `আমরা এই পণ্যটি মাত্র ${dataPoints} বার ট্র্যাক করেছি।`
          : `We've only tracked this product ${dataPoints} time(s). Need at least 5 data points.`,
      current_price: currentPrice,
      avg_30d: null,
      all_time_low: null,
      all_time_low_date: null,
      data_points: dataPoints,
      confidence: 0,
    };
  }

  const avg30d = Math.round(prices30d.reduce((a, b) => a + b, 0) / prices30d.length);
  const allTimeLow = Math.min(...allPrices);
  const discountFromAvg = avg30d > 0 ? (avg30d - currentPrice) / avg30d : 0;

  let label: VerdictLabel;
  let explanation: string;
  let dealScore: number;

  if (currentPrice > avg30d * 1.05) {
    label = "FAKE_DISCOUNT";
    const overpay = currentPrice - avg30d;
    explanation =
      lang === "bn"
        ? `দামটি ৩০ দিনের গড়ের (${fmt(avg30d)}) চেয়ে ${fmt(overpay)} বেশি।`
        : `Price is ${fmt(overpay)} ABOVE the 30-day average (${fmt(avg30d)}). NOT a good time to buy.`;
    dealScore = Math.max(1, Math.round(3 - (currentPrice / avg30d - 1) * 10));
  } else if (currentPrice <= allTimeLow * 1.02) {
    label = "BEST_PRICE";
    explanation =
      lang === "bn"
        ? `এটি আমাদের ট্র্যাক করা সর্বনিম্ন দাম! সর্বকালীন সর্বনিম্ন: ${fmt(allTimeLow)}।`
        : `Lowest price we've ever tracked! All-time low: ${fmt(allTimeLow)}.`;
    dealScore = 10;
  } else if (discountFromAvg >= 0.1) {
    label = "GOOD_DEAL";
    const pct = Math.round(discountFromAvg * 100);
    explanation =
      lang === "bn"
        ? `দামটি ৩০ দিনের গড় (${fmt(avg30d)}) এর চেয়ে ${pct}% কম।`
        : `Price is ${pct}% below the 30-day average (${fmt(avg30d)}). A good opportunity.`;
    dealScore = Math.min(9, 7 + Math.round(discountFromAvg * 20));
  } else if (discountFromAvg >= 0) {
    label = "FAIR_PRICE";
    explanation =
      lang === "bn"
        ? `দামটি স্বাভাবিক। ৩০ দিনের গড়: ${fmt(avg30d)}।`
        : `Normal price. No special deal right now. 30-day average: ${fmt(avg30d)}.`;
    dealScore = 5;
  } else {
    label = "FAKE_DISCOUNT";
    const overpay = currentPrice - avg30d;
    explanation =
      lang === "bn"
        ? `দামটি গড়ের চেয়ে বেশি। বিজ্ঞাপিত ছাড়টি বিভ্রান্তিকর।`
        : `Price is above the 30-day average (${fmt(avg30d)}). The advertised discount is misleading.`;
    dealScore = Math.max(1, 3 + Math.round(discountFromAvg * 10));
  }

  const confidence = Math.min(1, dataPoints / 30);

  return {
    label,
    deal_score: dealScore,
    display: displayMap[label],
    explanation,
    current_price: currentPrice,
    avg_30d: avg30d,
    all_time_low: allTimeLow,
    all_time_low_date: allTimeLowDate,
    data_points: dataPoints,
    confidence,
  };
}
