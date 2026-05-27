// Server-rendered FAQ for AEO/GEO. Question-based headings + self-contained
// ~140–160 word answers with the direct answer in the first lines = the passage
// shape AI engines (AI Overviews, ChatGPT, Perplexity) cite. Visible content
// only — no FAQPage schema (Google restricts FAQ rich results to gov/health).
// Every answer is factual; platform coverage is stated honestly (Daraz live,
// others expanding) so the page can't be accused of false claims.

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is DamKoi?",
    a: "DamKoi is a free price-tracking and fake-discount detection service for online shoppers in Bangladesh. It records the real price history of products sold on local marketplaces, so you can see whether a “50% off” deal is genuine or just a marked-up price dressed as a discount. Paste any product link and DamKoi shows the current price, its 30-day average, the lowest price ever recorded, and a plain verdict — best price, good deal, fair price, or fake discount. You can also set a price-drop alert and be notified when an item actually becomes cheaper. DamKoi exists because Bangladeshi shoppers have no easy way to verify whether festival and flash-sale prices are real. Instead of trusting the seller's own “before” price, DamKoi keeps an independent, timestamped record of what a product actually cost over time.",
  },
  {
    q: "Are discounts on Daraz real or fake?",
    a: "Some are real and many are not. A common tactic on Daraz and other marketplaces is to raise a product's list price shortly before a campaign, then advertise a large percentage off that inflated number — so the “discount” leaves you paying the same or more than the normal price. The only reliable way to tell is to compare the sale price against the product's genuine price history, not the seller's stated “original” price. DamKoi tracks the actual price of each product over time, so when a flash sale appears you can instantly see whether today's price is truly the lowest, roughly the 30-day average, or above it. If the “discounted” price is higher than what the item usually sells for, DamKoi labels it a fake discount, protecting you from overpaying during the very sales that promise the biggest savings.",
  },
  {
    q: "How do I check a product's real price history in Bangladesh?",
    a: "Copy the product link from Daraz, or another supported store, and paste it into DamKoi's homepage. DamKoi looks up the item, records its current price in Bangladeshi Taka, and shows a price-history chart along with three key numbers: the current price, the 30-day average, and the all-time low it has recorded. Each product page also gives a verdict — best price, good deal, fair price, or fake discount — so you do not have to interpret the chart yourself. Prices are captured directly from the store and stored as timestamped points, so the history reflects what the product genuinely cost, not what a seller claims. The longer DamKoi tracks an item, the more accurate the verdict becomes. If a product is new to DamKoi, it begins tracking immediately and a full verdict appears once enough price points are collected.",
  },
  {
    q: "Which shopping platforms does DamKoi track?",
    a: "DamKoi currently tracks Daraz Bangladesh, the country's largest online marketplace, and is expanding to other major local stores including Cartup, Rokomari, Pickaboo, Chaldal and Othoba. The goal is cross-platform price comparison: when the same product is sold on several sites, DamKoi shows each store's price side by side so you can buy from the cheapest one. Because prices, stock, and discounts differ between platforms — especially during festival campaigns like Eid and 11.11 — comparing across stores often saves more than any single advertised discount. DamKoi focuses on Bangladeshi retailers and prices everything in Taka, so the data is directly relevant to local shoppers rather than converted from foreign currencies. Support for additional platforms is added over time, and any product already tracked keeps its full price history as new stores come online.",
  },
  {
    q: "How does DamKoi detect a fake discount?",
    a: "DamKoi compares a product's current price against its own recorded price history rather than the seller's claimed “original” price. It calculates the 30-day average and the all-time low from prices it has captured over time. If the current price is meaningfully above the 30-day average, the advertised discount is misleading and DamKoi flags it as a fake discount. If the price matches the lowest ever recorded it is marked as the best price; if it sits well below the average it is a good deal; and a steady, unchanged price is shown as a fair price with no inflated markdown. This works because the manipulation almost always happens to the “before” number, which sellers control — but not to the independent history DamKoi keeps. The more days a product is tracked, the more confident and accurate the verdict becomes.",
  },
  {
    q: "Is DamKoi free to use?",
    a: "Yes. DamKoi is free for checking price history, comparing prices, and seeing whether a discount is genuine. Paste a product link to view its current price, 30-day average, all-time low, and verdict at no cost, and set price-drop alerts to be notified when an item actually gets cheaper. DamKoi is built for everyday Bangladeshi shoppers who want to avoid overpaying during sales, so the core price-intelligence features are open to everyone without a subscription. You do not need to create an account just to look up a product's price history. DamKoi makes money in ways that do not require charging shoppers for the basic information they need to buy at the right time.",
  },
];

export default function FAQSection() {
  return (
    <section className="max-w-3xl mx-auto px-1 py-16 md:py-24" aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-white"
      >
        Frequently asked questions
      </h2>
      <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
        How DamKoi tracks prices and spots fake discounts in Bangladesh.
      </p>

      <div className="flex flex-col gap-4">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="dk-card p-6 group" open>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
              <h3 className="text-base md:text-lg font-semibold text-white">{q}</h3>
            </summary>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
