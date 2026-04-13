import Link from "next/link";

import { fetchPublicProducts } from "@/lib/fastapi";

import AddToCartButton from "./_components/AddToCartButton";
import ProductViewLink from "./_components/ProductViewLink";

export default async function ProductsPage() {
  const allProducts = await fetchPublicProducts();
  const products = allProducts.filter((p) => p.status === "ACTIVE");

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>

      {products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {products.map((product) => {
            const imageUrl = product.image_url || "https://via.placeholder.com/400";

            return (
              <li key={product.id} className="rounded border p-4">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-56 w-full rounded object-cover"
                />

                <div className="mt-3 space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">{product.name}</h2>
                    <p className="line-clamp-2 text-sm text-gray-600">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{product.brand || product.category || "Apparel"}</span>
                    <span className="font-semibold text-black">
                      ${(product.price_cents / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <ProductViewLink href={`/products/${product.id}`} productId={product.id} />
                    <AddToCartButton productId={product.id} className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60" />
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
