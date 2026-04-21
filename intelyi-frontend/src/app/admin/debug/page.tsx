import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchPublicProducts } from "@/lib/fastapi";
import { requireAdminProxyUser } from "@/lib/server/backendProxy";
import {
  fetchBundleDebug,
  fetchRecommendationEvaluation,
  type BundleDebugItem,
  type RecommendationBreakdown,
} from "@/lib/server/recommendationDebug";

type AdminDebugPageProps = {
  searchParams: Promise<{
    session_id?: string;
    user_id?: string;
    product_id?: string;
  }>;
};

function formatPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{value}</p>
      {detail ? <p className="mt-1 text-sm text-zinc-600">{detail}</p> : null}
    </div>
  );
}

function ComponentPill({ label, value }: { label: string; value: number | string | null }) {
  return (
    <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700">
      <span className="font-medium text-zinc-950">{label}</span> {value ?? "none"}
    </span>
  );
}

function RecommendationRow({ item }: { item: RecommendationBreakdown }) {
  return (
    <tr className="border-t border-zinc-200 align-top">
      <td className="px-4 py-4">
        <div className="font-medium text-zinc-950">{item.name}</div>
        <div className="mt-1 text-xs text-zinc-500">
          {[item.brand, item.category, formatPrice(item.price_cents)].filter(Boolean).join(" / ")}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-zinc-700">
        <div className="font-semibold text-zinc-950">{item.score}</div>
        <div className="mt-1 text-xs text-zinc-500">baseline {item.baseline_score}</div>
      </td>
      <td className="px-4 py-4 text-sm text-zinc-700">
        <div>Current #{item.current_rank ?? "-"}</div>
        <div className="mt-1">Baseline #{item.baseline_rank ?? "-"}</div>
        <div className={item.rank_delta && item.rank_delta > 0 ? "mt-1 text-emerald-700" : "mt-1 text-zinc-500"}>
          Delta {item.rank_delta ?? 0}
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="max-w-md text-sm leading-6 text-zinc-700">{item.recommendation_reason}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ComponentPill label="global" value={item.components.global_score} />
          <ComponentPill label="personal" value={item.components.personal_score} />
          <ComponentPill label="weighted" value={item.components.personal_weighted_score} />
          <ComponentPill label="category" value={item.components.category_boost} />
          <ComponentPill label="repeat" value={item.components.repeat_penalty} />
          <ComponentPill label="diversity" value={item.components.diversity_penalty} />
        </div>
      </td>
    </tr>
  );
}

function BundleCard({ item }: { item: BundleDebugItem }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-950">{item.name}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {[item.brand, item.category, formatPrice(item.price_cents)].filter(Boolean).join(" / ")}
          </p>
        </div>
        <div className="rounded-md bg-zinc-950 px-2.5 py-1 text-sm font-semibold text-white">
          {item.score}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-700">{item.bundle_reason}</p>

      {item.debug ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <ComponentPill label="relationship" value={item.debug.relationship_score} />
          <ComponentPill label="category" value={item.debug.category_score} />
          <ComponentPill label="brand" value={item.debug.brand_score} />
          <ComponentPill label="price" value={item.debug.price_score} />
          <ComponentPill label="popularity" value={item.debug.popularity_score} />
          <ComponentPill label="duplicate" value={item.debug.duplicate_penalty} />
          <ComponentPill label="diversity" value={item.debug.diversity_penalty} />
        </div>
      ) : null}
    </article>
  );
}

async function requireAdminOrRedirect() {
  try {
    return await requireAdminProxyUser();
  } catch {
    redirect("/");
  }
}

export default async function AdminDebugPage({ searchParams }: AdminDebugPageProps) {
  await requireAdminOrRedirect();

  const params = await searchParams;
  const products = await fetchPublicProducts({ status: "ACTIVE", sort: "newest" });
  const selectedProductId = params.product_id || products[0]?.id || "";

  const [evaluation, bundleItems] = await Promise.all([
    fetchRecommendationEvaluation({
      userId: params.user_id,
      sessionId: params.session_id,
      limit: 8,
    }),
    selectedProductId ? fetchBundleDebug(selectedProductId, 4) : Promise.resolve([]),
  ]);
  const selectedProduct = products.find((product) => product.id === selectedProductId);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Admin debug</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Recommendation Explainability
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Inspect backend recommendation ranking, baseline comparison, score drivers, and bundle reasoning.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="font-medium text-zinc-700 underline underline-offset-4" href="/admin/products">
            Products
          </Link>
          <Link className="font-medium text-zinc-700 underline underline-offset-4" href="/">
            Storefront
          </Link>
        </div>
      </div>

      <form className="mb-8 grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Session ID</span>
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="session_id"
            defaultValue={params.session_id ?? ""}
            placeholder="shopper session id"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">User ID</span>
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="user_id"
            defaultValue={params.user_id ?? ""}
            placeholder="optional backend user id"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Bundle product</span>
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="product_id"
            defaultValue={selectedProductId}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button className="w-full rounded-md bg-zinc-950 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Inspect
          </button>
        </div>
      </form>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active products" value={evaluation.summary.active_product_count} />
        <MetricCard label="Interactions" value={evaluation.summary.interaction_count} />
        <MetricCard label="Personal signals" value={evaluation.summary.personal_interaction_count} />
        <MetricCard label="Avg score" value={evaluation.summary.average_score} detail="current top results" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Top Drivers</h2>
          <div className="mt-4 space-y-3">
            {evaluation.top_drivers.map((driver) => (
              <div key={driver.signal}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-zinc-800">{driver.signal}</span>
                  <span className="text-zinc-500">
                    {driver.impact} / {formatPercent(driver.share)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100">
                  <div className="h-2 rounded-full bg-zinc-950" style={{ width: formatPercent(driver.share) }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Baseline vs Current</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Overlap" value={formatPercent(evaluation.baseline_comparison.overlap_ratio)} />
            <MetricCard label="Moved up" value={evaluation.baseline_comparison.moved_up_products.length} />
            <MetricCard label="Top N" value={evaluation.baseline_comparison.top_n} />
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Current ranking adds personal affinity, repeat suppression, and diversity reranking on top of global
            recency-weighted demand.
          </p>
          {evaluation.baseline_comparison.moved_up_products.length > 0 ? (
            <p className="mt-2 text-sm text-zinc-700">
              Moved up: {evaluation.baseline_comparison.moved_up_products.join(", ")}
            </p>
          ) : null}
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <h2 className="text-lg font-semibold text-zinc-950">Recommendation Breakdown</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Shows current rank, baseline rank, score components, and human-readable recommendation reasons.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Why</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.recommendations.map((item) => (
                <RecommendationRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-950">Bundle Reasoning</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Selected product: {selectedProduct?.name ?? "No active product selected"}
          </p>
        </div>
        {bundleItems.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {bundleItems.map((item) => (
              <BundleCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
            No bundle candidates returned for this product.
          </div>
        )}
      </section>
    </main>
  );
}
