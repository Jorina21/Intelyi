"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Order, fetchOrderById } from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

type SuccessPageClientProps = {
  orderId: string | null;
  isSignedIn: boolean;
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SuccessPageClient({ orderId, isSignedIn }: SuccessPageClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const loadOrderUntilSettled = async () => {
      while (!cancelled && attempts < 5) {
        attempts += 1;

        try {
          const currentOrder = await fetchOrderById(orderId, {
            session_id: getOrCreateSessionId(),
          });

          if (cancelled) {
            return;
          }

          setOrder(currentOrder);
          setError(null);

          if (currentOrder.status === "PAID" || attempts === 5) {
            setLoading(false);
            return;
          }
        } catch (loadError) {
          if (cancelled) {
            return;
          }

          setError(loadError instanceof Error ? loadError.message : "Failed to load order.");
          setLoading(false);
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    void loadOrderUntilSettled();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="rounded-2xl border bg-white p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
          {isSignedIn ? "Post-purchase" : "Checkout"}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {isSignedIn ? "Payment received. Your account path is ready." : "Payment return received"}
        </h1>
        <p className="mt-3 text-gray-600">
          Payment completion is confirmed only by the backend after Stripe webhook verification.
          {isSignedIn
            ? " Once the order settles, you can move directly from this screen into the order detail view or your full order history."
            : " Guest orders still remain accessible through their direct order page."}
        </p>

        {loading ? <p className="mt-6 text-sm text-gray-600">Checking backend payment status...</p> : null}
        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

        {order ? (
          <div className="mt-6 rounded-xl border bg-zinc-50 p-6">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="mt-1 font-medium">{order.id}</p>
            <p className="mt-4 text-sm text-gray-600">Backend order status</p>
            <p className="mt-1 text-lg font-semibold">{order.status}</p>
            <p className="mt-4 text-sm text-gray-600">Order subtotal</p>
            <p className="mt-1 font-medium">{formatPrice(order.order_subtotal_cents)}</p>
            <p className="mt-4 text-sm text-gray-600">Paid at</p>
            <p className="mt-1 font-medium">
              {order.paid_at ? new Date(order.paid_at).toLocaleString() : "Still awaiting confirmed payment"}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={orderId ? `/orders/${orderId}` : "/cart"}
            className="inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {orderId ? "View order" : "Back to cart"}
          </Link>
          {isSignedIn ? (
            <>
              <Link
                href="/account/orders"
                className="inline-flex rounded-full border px-5 py-3 text-sm font-medium transition hover:bg-zinc-100"
              >
                View all orders
              </Link>
              <Link
                href="/account"
                className="inline-flex rounded-full border px-5 py-3 text-sm font-medium transition hover:bg-zinc-100"
              >
                Go to account
              </Link>
            </>
          ) : null}
          <Link
            href="/products"
            className="inline-flex rounded-full border px-5 py-3 text-sm font-medium transition hover:bg-zinc-100"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
