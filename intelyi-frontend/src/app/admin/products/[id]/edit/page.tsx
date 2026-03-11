import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ProductForm from "@/app/admin/products/_components/ProductForm";
import { fetchPublicProductById } from "@/lib/fastapi";

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

  const product = await fetchPublicProductById(id);

  if (!product) return notFound();

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm
        mode="edit"
        product={{
          id: product.id,
          name: product.name,
          description: product.description ?? "",
          price_cents: product.price_cents,
          status: product.status,
        }}
      />
    </main>
  );
}
