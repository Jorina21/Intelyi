import { NextResponse } from "next/server";
import {
  buildOwnerQueryFromRequest,
  getCurrentProxyUser,
  getFastApiBaseUrl,
  getInternalProxyHeaders,
} from "@/lib/server/backendProxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const user = await getCurrentProxyUser();
  const { itemId } = await params;
  const queryString = buildOwnerQueryFromRequest(new URL(request.url), user).toString();
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
      ...getInternalProxyHeaders(user?.id),
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
  const user = await getCurrentProxyUser();
  const { itemId } = await params;
  const queryString = buildOwnerQueryFromRequest(new URL(request.url), user).toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/cart/items/${itemId}?${queryString}`
    : `${getFastApiBaseUrl()}/cart/items/${itemId}`;

  const response = await fetch(targetUrl, {
    method: "DELETE",
    cache: "no-store",
    headers: getInternalProxyHeaders(user?.id),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to remove cart item" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
