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

  const form = await req.formData();
  const title = String(form.get("title") ?? "");
  const description = String(form.get("description") ?? "");
  const category = String(form.get("category") ?? "OTHER");
  const price = Number(form.get("price") ?? 0);
  const stockQty = Number(form.get("stockQty") ?? 0);

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
      status: "ACTIVE",
    },
  });

  return NextResponse.redirect(new URL(`/products/${product.id}`, req.url));
}
