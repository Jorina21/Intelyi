import Link from "next/link";

import type { Order } from "@/lib/fastapi";

type OrderHistoryListProps = {
  orders: Order[];
  emptyTitle: string;
  emptyCopy: string;
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatOrderDate(value: string | null) {
  if (!value) {
    return "Awaiting payment confirmation";
  }

  return new Date(value).toLocaleString();
}

export default function OrderHistoryList({
  orders,
  emptyTitle,
  emptyCopy,
}: OrderHistoryListProps) {
  if (orders.length === 0) {
    return (
      <section className="store-panel rounded-[32px] p-8 sm:p-10">
        <p className="store-kicker">No orders yet</p>
        <h2 className="store-display mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          {emptyTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--copy-muted)]">{emptyCopy}</p>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Continue shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {orders.map((order) => (
        <article
          key={order.id}
          className="store-panel grid gap-5 rounded-[28px] p-5 sm:grid-cols-[1.2fr_0.9fr_auto] sm:items-center sm:p-6"
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--copy-muted)]">
                Order
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-950">{order.id}</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[var(--copy-muted)]">
              <span>{order.total_item_count} item{order.total_item_count === 1 ? "" : "s"}</span>
              <span>{order.items.length} line{order.items.length === 1 ? "" : "s"}</span>
              <span>Placed {new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.items.slice(0, 3).map((item) => (
                <span
                  key={item.id}
                  className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                >
                  {item.product_name}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copy-muted)]">
                Status
              </p>
              <p className="mt-1 text-base font-semibold text-zinc-950">{order.status}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copy-muted)]">
                Paid
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{formatOrderDate(order.paid_at)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copy-muted)]">
                Subtotal
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">
                {formatPrice(order.order_subtotal_cents)}
              </p>
            </div>
            <Link
              href={`/orders/${order.id}`}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              View order
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
