import { NextResponse } from "next/server";
import {
  buildOwnerQueryFromRequest,
  getCurrentProxyUser,
  getFastApiBaseUrl,
  getInternalProxyHeaders,
} from "@/lib/server/backendProxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentProxyUser();
  const { id } = await params;
  const queryString = buildOwnerQueryFromRequest(new URL(request.url), user).toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/orders/${id}?${queryString}`
    : `${getFastApiBaseUrl()}/orders/${id}`;

  const response = await fetch(targetUrl, {
    cache: "no-store",
    headers: getInternalProxyHeaders(user?.id),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to fetch order" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
