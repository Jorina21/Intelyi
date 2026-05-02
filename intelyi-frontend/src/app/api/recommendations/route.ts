import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

function getFastApiBaseUrl() {
  return getApiBaseUrl();
}

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const queryString = incomingUrl.searchParams.toString();
  const targetUrl = queryString
    ? `${getFastApiBaseUrl()}/recommendations?${queryString}`
    : `${getFastApiBaseUrl()}/recommendations`;

  const response = await fetch(targetUrl, { cache: "no-store" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to fetch recommendations" },
      { status: response.status }
    );
  }

  return NextResponse.json(data, { status: response.status });
}
