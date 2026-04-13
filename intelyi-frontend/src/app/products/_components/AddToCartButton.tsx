"use client";

import { useState, useTransition } from "react";

import { addItemToCart } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

type AddToCartButtonProps = {
  productId: string;
  className?: string;
};

export default function AddToCartButton({
  productId,
  className,
}: AddToCartButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = () => {
    setMessage(null);

    startTransition(async () => {
      try {
        await addItemToCart({
          product_id: productId,
          quantity: 1,
          session_id: getOrCreateSessionId(),
        });
        setMessage("Added to cart.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to add item to cart.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isPending}
        className={
          className ??
          "rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isPending ? "Adding..." : "Add to Cart"}
      </button>

      {message ? (
        <p
          className={`text-sm ${
            message === "Added to cart." ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
