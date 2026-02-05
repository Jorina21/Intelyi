import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    include: { images: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>

      {products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((p) => {
            const img = p.images?.[0];
            return (
              <li key={p.id} className="border rounded p-4">
                {/* Using <img> for now; later we’ll switch to next/image + Cloudinary */}
                <img
                  src={img?.url ?? "https://via.placeholder.com/400"}
                  alt={img?.alt ?? p.title}
                  className="w-full h-56 object-cover rounded"
                />

                <div className="mt-3">
                  <h2 className="font-semibold text-lg">{p.title}</h2>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {p.description}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold">
                      ${(p.priceCents / 100).toFixed(2)}
                    </span>

                    <Link className="underline" href={`/products/${p.id}`}>
                      View
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
