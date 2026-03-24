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
