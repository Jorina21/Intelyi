"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  Cart,
  createOrderFromCurrentCart,
  fetchCurrentCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartPageClient() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCheckingOut, startCheckoutTransition] = useTransition();

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        setError(null);
        const currentCart = await fetchCurrentCart({ session_id: getOrCreateSessionId() });
        setCart(currentCart);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load cart.");
      } finally {
        setLoading(false);
      }
    };

    void loadCart();
  }, []);

  const runMutation = (itemId: string, action: () => Promise<Cart>) => {
    setError(null);
    setActiveItemId(itemId);

    startTransition(async () => {
      try {
        const nextCart = await action();
        setCart(nextCart);
      } catch (mutationError) {
        setError(mutationError instanceof Error ? mutationError.message : "Cart update failed.");
      } finally {
        setActiveItemId(null);
      }
    });
  };

  const handleProceedToCheckout = () => {
    setError(null);

    startCheckoutTransition(async () => {
      try {
        const order = await createOrderFromCurrentCart({ session_id: getOrCreateSessionId() });
        router.push(`/orders/${order.id}`);
      } catch (checkoutError) {
        setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      }
    });
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Your Cart</h1>
        <p className="text-gray-600">Loading cart...</p>
      </main>
    );
  }

  if (error && !cart) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Your Cart</h1>
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Your Cart</h1>
        {error ? <p className="mb-4 text-red-600">{error}</p> : null}
        <div className="rounded-lg border bg-white p-8">
          <p className="text-lg font-medium">Your cart is empty.</p>
          <p className="mt-2 text-gray-600">Add a product to start building your order.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Cart</h1>
        <Link className="underline" href="/products">
          Continue shopping
        </Link>
      </div>

      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {cart.items.map((item) => {
            const isBusy = isPending && activeItemId === item.id;

            return (
              <article
                key={item.id}
                className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-[120px_1fr]"
              >
                <img
                  src={item.product.image_url || "https://via.placeholder.com/300"}
                  alt={item.product.name}
                  className="h-28 w-full rounded object-cover"
                />

                <div className="flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">{item.product.name}</h2>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      {item.product.brand ? <span>{item.product.brand}</span> : null}
                      {item.product.category ? <span>{item.product.category}</span> : null}
                    </div>
                    <p className="text-sm text-gray-600">
                      Unit price: {formatPrice(item.unit_price_cents)}
                    </p>
                    <p className="text-sm font-medium">
                      Line subtotal: {formatPrice(item.line_subtotal_cents)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isBusy || item.quantity <= 1}
                      onClick={() =>
                        runMutation(item.id, () =>
                          updateCartItem(item.id, {
                            session_id: getOrCreateSessionId(),
                            quantity: Math.max(1, item.quantity - 1),
                          }),
                        )
                      }
                      className="rounded-full border px-3 py-1 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      -
                    </button>

                    <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        runMutation(item.id, () =>
                          updateCartItem(item.id, {
                            session_id: getOrCreateSessionId(),
                            quantity: item.quantity + 1,
                          }),
                        )
                      }
                      className="rounded-full border px-3 py-1 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        runMutation(item.id, () =>
                          removeCartItem(item.id, { session_id: getOrCreateSessionId() }),
                        )
                      }
                      className="ml-auto text-sm font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? "Updating..." : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Items</dt>
              <dd>{cart.total_item_count}</dd>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <dt>Subtotal</dt>
              <dd>{formatPrice(cart.cart_subtotal_cents)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-500">
            Totals are calculated by the backend and stay in sync with your cart state.
          </p>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={isCheckingOut}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCheckingOut ? "Creating order..." : "Proceed to Checkout"}
          </button>
          <p className="mt-3 text-xs text-gray-500">
            Checkout creates a backend-owned order record. Payment is not collected in this step.
          </p>
        </aside>
      </div>
    </main>
  );
}
