"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetchHomepagePromotionSlot,
  logPromotionSlotReward,
  type PromotionSlotSelection,
} from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

import ProductCard from "./ProductCard";

function StrategyBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
      {label.replaceAll("_", " ")}
    </span>
  );
}

export default function HomepagePromotionSlot() {
  const [selection, setSelection] = useState<PromotionSlotSelection | null>(null);
  const [error, setError] = useState(false);
  const rewardedDecisionIdsRef = useRef<Set<string>>(new Set());
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }

    loadedRef.current = true;

    async function loadSelection() {
      try {
        const sessionId = getOrCreateSessionId();
        const nextSelection = await fetchHomepagePromotionSlot(sessionId);
        setSelection(nextSelection);
      } catch {
        setError(true);
      }
    }

    void loadSelection();
  }, []);

  async function handleReward(productId: string) {
    if (!selection || rewardedDecisionIdsRef.current.has(selection.decision_id)) {
      return;
    }

    rewardedDecisionIdsRef.current.add(selection.decision_id);

    try {
      await logPromotionSlotReward({
        decision_id: selection.decision_id,
        session_id: getOrCreateSessionId(),
        product_id: productId,
      });
    } catch {
      rewardedDecisionIdsRef.current.delete(selection.decision_id);
    }
  }

  if (error || !selection) {
    return null;
  }

  return (
    <section className="space-y-5 rounded-[32px] border border-[var(--border)] bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="store-kicker">Adaptive merchandising slot</p>
          <h2 className="store-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            {selection.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--copy-muted)]">{selection.subtitle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{selection.rationale}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StrategyBadge label={selection.action_key} />
          <StrategyBadge label={selection.decision_mode} />
          <StrategyBadge label={`top ${selection.context.top_category ?? "none"}`} />
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-full gap-4">
          {selection.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="compact"
              onViewClick={handleReward}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

