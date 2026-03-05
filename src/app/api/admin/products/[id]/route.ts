import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function ensureAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

function getFastApiBaseUrl() {
  const fastApiBaseUrl = process.env.FASTAPI_BASE_URL;

  if (!fastApiBaseUrl) {
    return NextResponse.json(
      { error: "FASTAPI_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  return fastApiBaseUrl;
}

export async function PUT(req: Request, context: RouteContext) {
  const authError = await ensureAdmin();
  if (authError) return authError;

  const fastApiBaseUrl = getFastApiBaseUrl();
  if (fastApiBaseUrl instanceof NextResponse) return fastApiBaseUrl;

  const { id } = await context.params;
  const body = await req.text();
  const response = await fetch(`${fastApiBaseUrl}/admin/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
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
  const authError = await ensureAdmin();
  if (authError) return authError;

  const fastApiBaseUrl = getFastApiBaseUrl();
  if (fastApiBaseUrl instanceof NextResponse) return fastApiBaseUrl;

  const { id } = await context.params;
  const response = await fetch(`${fastApiBaseUrl}/admin/products/${id}`, {
    method: "DELETE",
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
