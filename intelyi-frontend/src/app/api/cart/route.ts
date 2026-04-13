import { NextResponse } from "next/server";

function getFastApiBaseUrl() {
  const baseUrl = process.env.FASTAPI_BASE_URL;
  if (!baseUrl) {
    throw new Error("FASTAPI_BASE_URL is missing. Check .env and restart the dev server.");
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const queryString = incomingUrl.searchParams.toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/cart?${queryString}`
    : `${getFastApiBaseUrl()}/cart`;

  const response = await fetch(targetUrl, { cache: "no-store" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to fetch cart" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
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
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to add cart item" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
