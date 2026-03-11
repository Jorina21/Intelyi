import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicProductById } from "@/lib/fastapi";

export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const product = await fetchPublicProductById(id);

  if (!product || product.status !== "ACTIVE") return notFound();

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link className="underline" href="/products">
          ← Back to products
        </Link>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>

      <img
        src="https://via.placeholder.com/1200x800"
        alt={product.name}
        className="w-full h-[520px] object-cover rounded"
      />

      <div className="mt-6 space-y-3">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-gray-700">{product.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-semibold">
            ${(product.price_cents / 100).toFixed(2)}
          </span>
          <span className="text-sm text-gray-600">Stock: N/A</span>
        </div>
      </div>
    </main>
  );
}
