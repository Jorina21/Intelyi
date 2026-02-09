"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProductFormMode = "create" | "edit";
type ProductCategory = "CLOTHING" | "HOUSEHOLD" | "OTHER";
type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

type ProductFormProps = {
  mode: ProductFormMode;
  product?: {
    id: string;
    title: string;
    description: string;
    category: ProductCategory;
    priceCents: number;
    stockQty: number;
    status: ProductStatus;
    imageUrl?: string | null;
  };
};

export default function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState<ProductCategory>(
    product?.category ?? "CLOTHING"
  );
  const [price, setPrice] = useState(
    product ? (product.priceCents / 100).toFixed(2) : ""
  );
  const [stockQty, setStockQty] = useState(
    product ? String(product.stockQty) : "0"
  );
  const [status, setStatus] = useState<ProductStatus>(
    product?.status ?? "ACTIVE"
  );
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        title,
        description,
        category,
        price: Number(price),
        stockQty: Number(stockQty),
        status,
      };

      const res = await fetch(
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save product");
      }

      const data = await res.json();
      const productId = mode === "create" ? data?.id : product?.id;

      if (file && productId) {
        const formData = new FormData();
        formData.append("productId", productId);
        formData.append("file", file);

        const uploadRes = await fetch("/api/admin/products/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadData?.error ?? "Image upload failed");
        }
      }

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
        <label className="block text-sm font-semibold">Title</label>
        <input
          name="title"
          className="border rounded w-full p-2"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
        <label className="block text-sm font-semibold">Category</label>
        <select
          name="category"
          className="border rounded w-full p-2"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory)}
          required
        >
          <option value="CLOTHING">CLOTHING</option>
          <option value="HOUSEHOLD">HOUSEHOLD</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-sm font-semibold">Stock Qty</label>
          <input
            name="stockQty"
            type="number"
            className="border rounded w-full p-2"
            required
            min={0}
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
          />
        </div>
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

      <div>
        <label className="block text-sm font-semibold">Image</label>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="border rounded w-full p-2"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div className="mt-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-64 object-cover rounded"
            />
          ) : product?.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-64 object-cover rounded"
            />
          ) : null}
        </div>
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
