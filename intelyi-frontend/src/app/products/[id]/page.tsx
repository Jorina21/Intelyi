import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchProductBundle, fetchPublicProductById } from "@/lib/fastapi";

import AddToCartButton from "../_components/AddToCartButton";
import ProductViewLink from "../_components/ProductViewLink";
import ProductDetailInteractionLogger from "./ProductDetailInteractionLogger";

export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const product = await fetchPublicProductById(id);

  if (!product || product.status !== "ACTIVE") return notFound();

  const bundleItems = await fetchProductBundle(product.id, 4);

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

      {bundleItems.length > 0 ? (
        <section className="mt-12 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="store-kicker">Recommended together</p>
              <h2 className="store-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                Complete the Set
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--copy-muted)]">
              Backend-ranked bundle picks use category fit, price compatibility, shopper activity, and diversity controls.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {bundleItems.map((item) => (
              <article key={item.id} className="store-panel overflow-hidden rounded-[28px]">
                <div className="relative bg-[var(--surface-muted)]">
                  <Image
                    src={item.image_url || "https://via.placeholder.com/900x1200?text=Intelyi"}
                    alt={item.name}
                    width={900}
                    height={1200}
                    unoptimized
                    className="h-64 w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 backdrop-blur">
                    Score {item.score}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--copy-muted)]">
                      {item.brand || item.category || "Bundle pick"}
                    </p>
                    <h3 className="text-base font-semibold leading-tight text-zinc-950">
                      {item.name}
                    </h3>
                    <p className="line-clamp-3 text-sm leading-6 text-[var(--copy-muted)]">
                      {item.bundle_reason}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--copy-muted)]">Price</p>
                      <p className="text-2xl font-semibold tracking-tight text-zinc-950">
                        ${(item.price_cents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProductViewLink href={`/products/${item.id}`} productId={item.id} />
                      <AddToCartButton
                        productId={item.id}
                        className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
