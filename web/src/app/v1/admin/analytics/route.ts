import { NextRequest, NextResponse } from "next/server";
import { createServerClient, cors, verifyAdmin } from "@/lib/supabase-server";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

// Aggregates catalog/platform/trend/storage figures via the admin_analytics
// SQL function so heavy joins stay in Postgres (one round-trip).
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const days = Math.min(
    365,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)),
  );

  const db = createServerClient();
  const { data, error } = await db.rpc("admin_analytics", { days });
  if (error) {
    return NextResponse.json(
      { detail: error.message },
      { status: 500, headers: cors() },
    );
  }

  return NextResponse.json(data, {
    headers: {
      ...cors(),
      "Cache-Control": "private, max-age=60",
    },
  });
}
