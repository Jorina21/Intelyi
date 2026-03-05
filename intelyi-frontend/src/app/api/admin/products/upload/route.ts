import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
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

  const fastApiBaseUrl = process.env.FASTAPI_BASE_URL;
  if (!fastApiBaseUrl) {
    return NextResponse.json(
      { error: "FASTAPI_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const response = await fetch(`${fastApiBaseUrl}/admin/products/upload`, {
    method: "POST",
    body: formData,
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
