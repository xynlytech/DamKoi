export type Platform =
  | 'daraz'
  | 'cartup'
  | 'rokomari'
  | 'pickaboo'
  | 'chaldal'
  | 'othoba';

export function detectPlatformAndId(url: string): { platform: Platform | null; externalId: string | null } {
  if (!url) return { platform: null, externalId: null };
  const lower = url.toLowerCase();

  if (lower.includes('daraz.com.bd')) {
    return { platform: 'daraz', externalId: extractDarazId(url) };
  }
  if (lower.includes('cartup.com.bd')) {
    const m = url.match(/\/products?\/([^/?#]+)/);
    return { platform: 'cartup', externalId: m?.[1] ?? null };
  }
  if (lower.includes('rokomari.com')) {
    const m = url.match(/\/(?:book|product)\/(\d+)/);
    return { platform: 'rokomari', externalId: m?.[1] ?? null };
  }
  if (lower.includes('pickaboo.com')) {
    const m = url.match(/\/(?:product|detail)\/([^/?#]+)/);
    return { platform: 'pickaboo', externalId: m?.[1] ?? null };
  }
  if (lower.includes('chaldal.com')) {
    const m = url.match(/\/p\/(\d+)/);
    return { platform: 'chaldal', externalId: m?.[1] ?? null };
  }
  if (lower.includes('othoba.com')) {
    const m = url.match(/\/product\/([^/?#]+)/);
    return { platform: 'othoba', externalId: m?.[1] ?? null };
  }

  return { platform: null, externalId: null };
}

function extractDarazId(url: string): string | null {
  let m = url.match(/i(\d+)(?:-s\d+)?\.html/);
  if (m) return m[1];
  m = url.match(/[?&]itemId=(\d+)/);
  if (m) return m[1];
  m = url.match(/[-/]i(\d+)(?:[^\d]|$)/);
  if (m) return m[1];
  return null;
}
