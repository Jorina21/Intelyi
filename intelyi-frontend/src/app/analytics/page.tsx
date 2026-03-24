import Link from "next/link";
import { getProductAnalytics, type ProductAnalytics } from "@/lib/fastapi";

function formatCtr(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export default async function AnalyticsPage() {
  let analytics: ProductAnalytics[] = [];
  let errorMessage: string | null = null;

  try {
    analytics = await getProductAnalytics();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load analytics.";
  }

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Product Analytics</h1>
        <div className="flex items-center gap-4">
          <Link className="underline" href="/products">
            Products
          </Link>
          <Link className="underline" href="/">
            Home
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="text-lg font-medium text-red-800">Analytics unavailable.</p>
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
        </div>
      ) : analytics.length === 0 ? (
        <div className="rounded border p-6">
          <p className="text-lg font-medium">No analytics data yet.</p>
          <p className="mt-2 text-sm text-gray-600">
            Add active products and interaction events to populate product engagement metrics.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Views</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Clicks</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Add to Cart
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Purchases
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Score</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {analytics.map((product) => (
                <tr key={product.product_id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{product.views}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{product.clicks}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{product.add_to_cart}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{product.purchases}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{product.score}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCtr(product.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
