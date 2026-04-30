"use client";

import Image from "next/image";

import type { PublicProduct, RecommendedProduct } from "@/lib/fastapi";

import AddToCartButton from "../products/_components/AddToCartButton";
import ProductViewLink from "../products/_components/ProductViewLink";

type ProductCardProps = {
  product: PublicProduct | RecommendedProduct;
  variant?: "default" | "compact";
  className?: string;
  showScore?: boolean;
  onViewClick?: (productId: string) => Promise<void> | void;
};

function formatPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export default function ProductCard({
  product,
  variant = "default",
  className,
  showScore = false,
  onViewClick,
}: ProductCardProps) {
  const isCompact = variant === "compact";
  const imageUrl = product.image_url || "https://via.placeholder.com/900x1200?text=Intelyi";
  const metadata = product.brand || product.category || "Curated pick";
  const score = "score" in product ? product.score : null;

  return (
    <article
      className={`store-panel group overflow-hidden rounded-[28px] ${isCompact ? "min-w-[280px] max-w-[320px]" : ""} ${className ?? ""}`}
    >
      <div className="relative overflow-hidden bg-[var(--surface-muted)]">
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {product.category ? (
            <span className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 backdrop-blur">
              {product.category}
            </span>
          ) : null}
          {showScore && score !== null ? (
            <span className="rounded-full bg-zinc-950/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-100">
              Score {score}
            </span>
          ) : null}
        </div>

        <Image
          src={imageUrl}
          alt={product.name}
          width={900}
          height={1200}
          unoptimized
          className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${isCompact ? "h-72" : "h-80"}`}
        />
      </div>

      <div className={`space-y-4 p-5 ${isCompact ? "p-4" : ""}`}>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--copy-muted)]">
            {metadata}
          </p>
          <h3 className={`leading-tight text-zinc-950 ${isCompact ? "text-base font-semibold" : "text-lg font-semibold"}`}>
            {product.name}
          </h3>
          <p className={`text-[var(--copy-muted)] ${isCompact ? "line-clamp-2 text-sm" : "line-clamp-3 text-sm leading-6"}`}>
            {product.description || "A curated catalog item sourced through Intelyi's backend-owned storefront pipeline."}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--copy-muted)]">Price</p>
            <p className={`font-semibold tracking-tight text-zinc-950 ${isCompact ? "text-2xl" : "text-3xl"}`}>
              {formatPrice(product.price_cents)}
            </p>
          </div>
          <div className="hidden rounded-2xl bg-[var(--surface-muted)] px-3 py-2 text-right text-xs text-[var(--copy-muted)] sm:block">
            <div>Source</div>
            <div className="font-medium text-zinc-700">
              {product.source_dataset ? product.source_dataset.replaceAll("_", " ") : "catalog"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <ProductViewLink href={`/products/${product.id}`} productId={product.id} onBeforeNavigate={onViewClick} />
          <AddToCartButton
            productId={product.id}
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
    </article>
  );
}
