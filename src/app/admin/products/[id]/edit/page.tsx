import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ProductForm from "@/app/admin/products/_components/ProductForm";

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/");

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!product) return notFound();

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm
        mode="edit"
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          category: product.category,
          priceCents: product.priceCents,
          stockQty: product.stockQty,
          status: product.status,
          imageUrl: product.images?.[0]?.url ?? null,
        }}
      />
    </main>
  );
}
