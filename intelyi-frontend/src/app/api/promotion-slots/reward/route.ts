import { NextResponse } from "next/server";

import { getCurrentProxyUser, getFastApiBaseUrl, getInternalProxyHeaders, normalizeOwnerPayload } from "@/lib/server/backendProxy";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const user = await getCurrentProxyUser();
  const response = await fetch(`${getFastApiBaseUrl()}/promotion-slots/reward`, {
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
    return NextResponse.json(data ?? { error: "Failed to log promotion slot reward" }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}

