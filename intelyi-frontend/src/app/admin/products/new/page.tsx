import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ProductForm from "@/app/admin/products/_components/ProductForm";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/");

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <ProductForm mode="create" />
    </main>
  );
}
