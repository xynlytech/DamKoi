import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API}/alerts/push-subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? "";
  const endpoint = searchParams.get("endpoint") ?? "";
  const res = await fetch(
    `${API}/alerts/push-unsubscribe?email=${encodeURIComponent(email)}&endpoint=${encodeURIComponent(endpoint)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
