import { NextResponse } from "next/server";
import {
  getCurrentProxyUser,
  getFastApiBaseUrl,
  getInternalProxyHeaders,
  normalizeOwnerPayload,
} from "@/lib/server/backendProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentProxyUser();
  const { id } = await params;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const response = await fetch(`${getFastApiBaseUrl()}/orders/${id}/checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getInternalProxyHeaders(user?.id),
    },
    body: JSON.stringify(normalizeOwnerPayload(payload, user)),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to create checkout session" },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}
