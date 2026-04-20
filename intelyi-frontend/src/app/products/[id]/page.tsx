import Image from "next/image";
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ProductDetailInteractionLogger productId={product.id} />

      <div className="mb-6 flex items-center justify-between">
        <Link className="text-sm font-medium text-zinc-700 underline decoration-[var(--border)] underline-offset-4" href="/products">
          ← Back to products
        </Link>
        <Link className="text-sm font-medium text-zinc-700 underline decoration-[var(--border)] underline-offset-4" href="/">
          Home
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="store-panel overflow-hidden rounded-[36px]">
          <Image
            src={product.image_url || "https://via.placeholder.com/1200x800?text=Intelyi"}
            alt={product.name}
            width={1400}
            height={1200}
            unoptimized
            className="h-[540px] w-full object-cover"
          />
        </div>

        <div className="store-panel rounded-[36px] p-6 sm:p-8">
          <p className="store-kicker">{product.category || product.brand || "Storefront product"}</p>
          <h1 className="store-display mt-4 text-4xl font-semibold leading-tight tracking-tight text-zinc-950">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--copy-muted)]">
            {product.brand ? <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5">{product.brand}</span> : null}
            {product.category ? <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5">{product.category}</span> : null}
          </div>

          <p className="mt-6 text-sm leading-7 text-[var(--copy-muted)]">
            {product.description}
          </p>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--copy-muted)]">Price</p>
              <span className="text-4xl font-semibold tracking-tight text-zinc-950">
                ${(product.price_cents / 100).toFixed(2)}
              </span>
            </div>
            <AddToCartButton productId={product.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
