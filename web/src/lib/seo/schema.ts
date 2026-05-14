/**
 * DamKoi — SEO Schema Engine
 * 
 * Generates structured data (JSON-LD) for Products and comparisons.
 */

export type SchemaConfig = {
  baseUrl: string;
};

type ProductSchemaInput = {
  id: string;
  title: string;
  image_url?: string | null;
  platform: string;
  brand?: string | null;
  deal_score?: number | null;
  external_id: string;
  current_price?: number | null;
  in_stock?: boolean | null;
  url: string;
};

type PriceHistorySchemaInput = {
  price: number;
  scraped_at: string;
};

export const SchemaEngine = {
  /**
   * Generates Product Schema with Price History
   */
  product(product: ProductSchemaInput, history: PriceHistorySchemaInput[], config: SchemaConfig) {
    const prices = history.map(h => ({
      "@type": "PriceSpecification",
      "price": h.price / 100,
      "priceCurrency": "BDT",
      "validFrom": h.scraped_at
    }));

    return {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.title,
      "image": [product.image_url],
      "description": `Tracked price history for ${product.title} on ${product.platform}. Deal score: ${product.deal_score}/10.`,
      "sku": product.external_id,
      "brand": {
        "@type": "Brand",
        "name": product.brand || product.platform
      },
      "offers": {
        "@type": "Offer",
        "url": `${config.baseUrl}/product/${product.id}`,
        "priceCurrency": "BDT",
        "price": (product.current_price || 0) / 100,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "priceSpecification": prices
      }
    };
  },

  /**
   * Generates Comparison Schema (DamKoi vs Competitor)
   */
  comparison(title: string, competitor: string, config: SchemaConfig) {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": title,
      "description": `See how DamKoi compares to ${competitor} for Daraz Bangladesh shopping intelligence.`,
      "publisher": {
        "@type": "Organization",
        "name": "DamKoi",
        "logo": {
          "@type": "ImageObject",
          "url": `${config.baseUrl}/icons/dk_logo.svg`
        }
      }
    };
  }
};
