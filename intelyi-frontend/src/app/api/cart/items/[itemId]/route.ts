import { NextResponse } from "next/server";

function getFastApiBaseUrl() {
  const baseUrl = process.env.FASTAPI_BASE_URL;
  if (!baseUrl) {
    throw new Error("FASTAPI_BASE_URL is missing. Check .env and restart the dev server.");
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const incomingUrl = new URL(request.url);
  const queryString = incomingUrl.searchParams.toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/cart/items/${itemId}?${queryString}`
    : `${getFastApiBaseUrl()}/cart/items/${itemId}`;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const response = await fetch(targetUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to update cart item" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const incomingUrl = new URL(request.url);
  const queryString = incomingUrl.searchParams.toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/cart/items/${itemId}?${queryString}`
    : `${getFastApiBaseUrl()}/cart/items/${itemId}`;

  const response = await fetch(targetUrl, {
    method: "DELETE",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to remove cart item" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
