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

  const formData = await req.formData();
  const response = await fetch(`${getFastApiBaseUrl()}/admin/products/upload`, {
    method: "POST",
    headers: getInternalProxyHeaders(adminUser.id),
    body: formData,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
