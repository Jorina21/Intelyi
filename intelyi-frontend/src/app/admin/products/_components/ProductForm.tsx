"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductFormMode = "create" | "edit";
type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

type ProductFormProps = {
  mode: ProductFormMode;
  product?: {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    status: string;
  };
};

export default function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(
    product ? (product.price_cents / 100).toFixed(2) : ""
  );
  const [status, setStatus] = useState<ProductStatus>(
    (product?.status as ProductStatus) ?? "ACTIVE"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        description,
        price_cents: Math.round(Number(price) * 100),
        status,
      };

      const res = await fetch(
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save product");
      }

      const data = await res.json().catch(() => ({}));
      const productId = mode === "create" ? data?.id : product?.id;

      router.push(`/products/${productId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold">Name</label>
        <input
          name="name"
          className="border rounded w-full p-2"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold">Description</label>
        <textarea
          name="description"
          className="border rounded w-full p-2"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold">Price (USD)</label>
        <input
          name="price"
          type="number"
          step="0.01"
          className="border rounded w-full p-2"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold">Status</label>
        <select
          name="status"
          className="border rounded w-full p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus)}
          required
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        className="border rounded w-full p-3 font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
      </button>
    </form>
  );
}
