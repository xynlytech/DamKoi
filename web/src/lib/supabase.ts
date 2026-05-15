import { createClient } from "@supabase/supabase-js";

// Fallbacks prevent build-time prerender crash when env vars are not set.
// In production the real values are embedded by Next.js at build time.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);
