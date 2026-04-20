"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
  Order,
  createCheckoutSessionForOrder,
  fetchOrderById,
} from "@/lib/fastapi";
import { getOrCreateSessionId } from "@/lib/session";

type OrderDetailClientProps = {
  orderId: string;
  isSignedIn: boolean;
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderDetailClient({ orderId, isSignedIn }: OrderDetailClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingPayment, startPaymentTransition] = useTransition();

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const currentOrder = await fetchOrderById(orderId, {
          session_id: getOrCreateSessionId(),
        });
        setOrder(currentOrder);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load order.");
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [orderId]);

  const handleStartPayment = () => {
    setError(null);

    startPaymentTransition(async () => {
      try {
        const checkoutSession = await createCheckoutSessionForOrder(orderId, {
          session_id: getOrCreateSessionId(),
        });
        window.location.assign(checkoutSession.checkout_url);
      } catch (paymentError) {
        setError(paymentError instanceof Error ? paymentError.message : "Failed to start payment.");
      }
    });
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Order Summary</h1>
        <p className="text-gray-600">Loading order...</p>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Order Summary</h1>
        <p className="text-red-600">{error}</p>
        <Link
          href={isSignedIn ? "/account/orders" : "/cart"}
          className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          {isSignedIn ? "Back to order history" : "Back to cart"}
        </Link>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-3xl font-bold">Order Summary</h1>
        <p className="text-red-600">Order not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            {isSignedIn ? "Account order" : "Checkout"}
          </p>
          <h1 className="mt-2 text-3xl font-bold">Order Summary</h1>
          <p className="mt-2 text-sm text-gray-600">Order ID: {order.id}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isSignedIn ? (
            <>
              <Link
                href="/account"
                className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
              >
                Account
              </Link>
              <Link
                href="/account/orders"
                className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
              >
                Order history
              </Link>
            </>
          ) : null}
          <div className="rounded-full border px-4 py-2 text-sm font-semibold">
            Status: {order.status}
          </div>
        </div>
      </div>

      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {order.items.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-[120px_1fr]"
            >
              <img
                src={item.product_image_url || "https://via.placeholder.com/300"}
                alt={item.product_name}
                className="h-28 w-full rounded object-cover"
              />

              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{item.product_name}</h2>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    {item.product_brand ? <span>{item.product_brand}</span> : null}
                    {item.product_category ? <span>{item.product_category}</span> : null}
                  </div>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm text-gray-600">
                    Unit price: {formatPrice(item.unit_price_cents)}
                  </p>
                  <p className="text-sm font-medium">
                    Line subtotal: {formatPrice(item.line_subtotal_cents)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold">Order Totals</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Items</dt>
              <dd>{order.total_item_count}</dd>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.order_subtotal_cents)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-500">
            Totals come from the backend order snapshot and are the only values used for payment.
          </p>
          {order.status === "PENDING" ? (
            <>
              <button
                type="button"
                onClick={handleStartPayment}
                disabled={isStartingPayment}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingPayment ? "Redirecting..." : "Pay with Stripe"}
              </button>
              <p className="mt-3 text-xs text-gray-500">
                Payment starts from the backend and redirects you into Stripe Checkout.
              </p>
            </>
          ) : (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Payment has been confirmed by the backend.
            </p>
          )}
          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>User ID: {order.user_id ?? "Guest checkout context"}</p>
            <p>Session ID: {order.session_id ?? "Account-owned order"}</p>
            <p>Paid at: {order.paid_at ? new Date(order.paid_at).toLocaleString() : "Not paid yet"}</p>
          </div>
          <Link
            href={isSignedIn ? "/account/orders" : "/cart"}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-sm font-medium transition hover:bg-zinc-100"
          >
            {isSignedIn ? "Back to order history" : "Back to cart"}
          </Link>
        </aside>
      </div>
    </main>
  );
}
