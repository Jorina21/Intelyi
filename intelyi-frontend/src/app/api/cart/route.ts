import { NextResponse } from "next/server";
import {
  buildOwnerQueryFromRequest,
  getCurrentProxyUser,
  getFastApiBaseUrl,
  getInternalProxyHeaders,
  normalizeOwnerPayload,
} from "@/lib/server/backendProxy";

export async function GET(request: Request) {
  const user = await getCurrentProxyUser();
  const queryString = buildOwnerQueryFromRequest(new URL(request.url), user).toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/cart?${queryString}`
    : `${getFastApiBaseUrl()}/cart`;

  const response = await fetch(targetUrl, {
    cache: "no-store",
    headers: getInternalProxyHeaders(user?.id),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to fetch cart" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  const user = await getCurrentProxyUser();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const response = await fetch(`${getFastApiBaseUrl()}/cart/items`, {
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
    return NextResponse.json(data ?? { error: "Failed to add cart item" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
