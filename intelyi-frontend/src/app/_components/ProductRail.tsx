import Link from "next/link";

import type { PublicProduct, RecommendedProduct } from "@/lib/fastapi";

import ProductCard from "./ProductCard";

type ProductRailProps = {
  title: string;
  subtitle: string;
  href?: string;
  products: Array<PublicProduct | RecommendedProduct>;
  showScore?: boolean;
};

export default function ProductRail({
  title,
  subtitle,
  href = "/products",
  products,
  showScore = false,
}: ProductRailProps) {
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="store-kicker">Merchandising row</p>
          <h2 className="store-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--copy-muted)]">{subtitle}</p>
        </div>
        <Link href={href} className="hidden text-sm font-medium text-zinc-700 underline decoration-[var(--border)] underline-offset-4 hover:text-zinc-950 md:inline">
          Explore all
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-full gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="compact"
              showScore={showScore}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
