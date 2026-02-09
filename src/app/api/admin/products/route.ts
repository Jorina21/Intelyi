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

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "");
  const description = String(body?.description ?? "");
  const category = String(body?.category ?? "OTHER");
  const price = Number(body?.price ?? 0);
  const stockQty = Number(body?.stockQty ?? 0);
  const status = String(body?.status ?? "ACTIVE");

  if (!title || !description || !Number.isFinite(price)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const priceCents = Math.round(price * 100);

  const product = await prisma.product.create({
    data: {
      title,
      description,
      category: category as any,
      priceCents,
      stockQty,
      status: status as any,
    },
  });

  return NextResponse.json({ id: product.id });
}
