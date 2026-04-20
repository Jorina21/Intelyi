"use client";

import { useEffect, useState } from "react";

import { fetchRecommendedProducts, type RecommendedProduct } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

import ProductCard from "./ProductCard";

type HomeRecommendationsProps = {
  initialProducts: RecommendedProduct[];
};

export default function HomeRecommendations({ initialProducts }: HomeRecommendationsProps) {
  const [products, setProducts] = useState(initialProducts);

  useEffect(() => {
    async function loadPersonalizedRecommendations() {
      try {
        const sessionId = getOrCreateSessionId();
        const personalizedProducts = await fetchRecommendedProducts({
          session_id: sessionId,
          limit: 6,
        });
        setProducts(personalizedProducts);
      } catch {
        setProducts(initialProducts);
      }
    }

    void loadPersonalizedRecommendations();
  }, [initialProducts]);

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="store-kicker">Personalized discovery</p>
          <h2 className="store-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Recommended for this browsing session
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--copy-muted)]">
            Backend-ranked recommendations stay visible, but the presentation now feels like a curated commerce rail instead of a plain list.
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/70 p-6 text-sm text-[var(--copy-muted)]">
          No recommendations yet. Interactions will start shaping product ranking as people browse.
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-full gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-[280px] max-w-[320px]"
            >
              <ProductCard product={product} variant="compact" showScore />
            </div>
          ))}
          </div>
        </div>
      )}
    </section>
  );
}
