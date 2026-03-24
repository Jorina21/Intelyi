"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchRecommendedProducts, type RecommendedProduct } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

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
          limit: 3,
        });
        setProducts(personalizedProducts);
      } catch {
        setProducts(initialProducts);
      }
    }

    void loadPersonalizedRecommendations();
  }, [initialProducts]);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          Recommended Products
        </h2>
        <Link className="underline text-sm" href="/products">
          View all
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No recommendations yet. Interactions will start shaping product ranking as people browse.
        </p>
      ) : (
        <ul className="grid gap-4">
          {products.map((product) => (
            <li
              key={product.id}
              className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-black dark:text-zinc-50">{product.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {product.description}
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-medium text-black dark:text-zinc-50">
                    ${(product.price_cents / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Score: {product.score}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
