import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchPublicProductById } from "@/lib/fastapi";

import AddToCartButton from "../_components/AddToCartButton";
import ProductDetailInteractionLogger from "./ProductDetailInteractionLogger";

export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const product = await fetchPublicProductById(id);

  if (!product || product.status !== "ACTIVE") return notFound();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <ProductDetailInteractionLogger productId={product.id} />

      <div className="mb-6 flex items-center justify-between">
        <Link className="underline" href="/products">
          ← Back to products
        </Link>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>

      <img
        src={product.image_url || "https://via.placeholder.com/1200x800"}
        alt={product.name}
        className="h-[520px] w-full rounded object-cover"
      />

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {product.brand ? <span>{product.brand}</span> : null}
            {product.category ? <span>{product.category}</span> : null}
          </div>
          <p className="text-gray-700">{product.description}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-2xl font-semibold">
            ${(product.price_cents / 100).toFixed(2)}
          </span>
          <AddToCartButton productId={product.id} />
        </div>
      </div>
    </main>
  );
}
