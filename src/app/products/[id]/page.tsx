import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params; // ✅ Next.js 16: params can be a Promise

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!product || product.status !== "ACTIVE") return notFound();

  const img = product.images?.[0];

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link className="underline" href="/products">
          ← Back to products
        </Link>
        <Link className="underline" href="/">
          Home
        </Link>
      </div>

      <img
        src={img?.url ?? "https://via.placeholder.com/800x600"}
        alt={img?.alt ?? product.title}
        className="w-full h-[420px] object-cover rounded"
      />

      <h1 className="text-3xl font-bold mt-6">{product.title}</h1>

      <p className="text-gray-700 mt-3">{product.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-2xl font-semibold">
          ${(product.priceCents / 100).toFixed(2)}
        </span>

        <span className="text-sm text-gray-600">Stock: {product.stockQty}</span>
      </div>

      <button
        className="mt-6 w-full border rounded p-3 font-semibold"
        disabled={product.stockQty <= 0}
      >
        Add to Cart (coming next)
      </button>
    </main>
  );
}
