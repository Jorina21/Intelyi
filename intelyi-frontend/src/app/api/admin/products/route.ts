import { NextResponse } from "next/server";
import { getFastApiBaseUrl, getInternalProxyHeaders, requireAdminProxyUser } from "@/lib/server/backendProxy";

export async function POST(req: Request) {
  let adminUser;
  try {
    adminUser = await requireAdminProxyUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const body = await req.text();
  const response = await fetch(`${getFastApiBaseUrl()}/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getInternalProxyHeaders(adminUser.id),
    },
    body,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
