import { NextResponse } from "next/server";
import { getFastApiBaseUrl, getInternalProxyHeaders, requireAdminProxyUser } from "@/lib/server/backendProxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function ensureAdmin() {
  try {
    return await requireAdminProxyUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const adminUser = await ensureAdmin();
  if (adminUser instanceof NextResponse) return adminUser;

  const { id } = await context.params;
  const body = await req.text();
  const response = await fetch(`${getFastApiBaseUrl()}/admin/products/${id}`, {
    method: "PUT",
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

export async function DELETE(_req: Request, context: RouteContext) {
  const adminUser = await ensureAdmin();
  if (adminUser instanceof NextResponse) return adminUser;

  const { id } = await context.params;
  const response = await fetch(`${getFastApiBaseUrl()}/admin/products/${id}`, {
    method: "DELETE",
    headers: getInternalProxyHeaders(adminUser.id),
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
