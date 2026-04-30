import { NextResponse } from "next/server";

import { buildOwnerQueryFromRequest, getCurrentProxyUser, getFastApiBaseUrl, getInternalProxyHeaders } from "@/lib/server/backendProxy";

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const user = await getCurrentProxyUser();
  const params = buildOwnerQueryFromRequest(incomingUrl, user);
  const limit = incomingUrl.searchParams.get("limit");

  if (limit) {
    params.set("limit", limit);
  }

  const queryString = params.toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/promotion-slots/homepage?${queryString}`
    : `${getFastApiBaseUrl()}/promotion-slots/homepage`;
  const response = await fetch(targetUrl, {
    cache: "no-store",
    headers: getInternalProxyHeaders(user?.id),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { error: "Failed to fetch promotion slot" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}

