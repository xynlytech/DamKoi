import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DealCard, { type DealItem } from "@/components/DealCard";

export default function DealsPreview({ deals }: { deals: DealItem[] }) {
  if (!deals.length) return null;

  return (
    <section className="py-14 sm:py-20" aria-labelledby="deals-heading">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="dk-eyebrow mb-2">Verified price drops</p>
          <h2 id="deals-heading" className="dk-section-title">Today&apos;s real deals</h2>
          <p className="dk-section-sub mt-2">
            Each of these is selling below its own 30-day average, not below a made-up &ldquo;original&rdquo; price.
          </p>
        </div>
        <Link href="/deals" className="dk-btn-secondary hidden sm:inline-flex flex-shrink-0 dk-focus">
          See all deals <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => (
          <DealCard key={deal.product.id} deal={deal} />
        ))}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Link href="/deals" className="dk-btn-secondary w-full dk-focus">
          See all deals <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
