import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

function getFastApiBaseUrl() {
  return getApiBaseUrl();
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const response = await fetch(`${getFastApiBaseUrl()}/interactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to create interaction" },
      { status: response.status }
    );
  }

  return NextResponse.json(data, { status: response.status });
}
