import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) redirect("/api/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/");

  const products = await prisma.product.findMany({
    include: { images: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Products</h1>
        <div className="flex items-center gap-4">
          <Link className="underline" href="/admin/products/new">
            New Product
          </Link>
          <Link className="underline" href="/">
            Home
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <ul className="space-y-4">
          {products.map((p) => (
            <li key={p.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-gray-600">
                    {p.category} • {p.status} • ${(p.priceCents / 100).toFixed(2)}
                  </p>
                </div>

                <Link className="underline" href={`/admin/products/${p.id}/edit`}>
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
