import Link from "next/link";

import OrderHistoryList from "@/app/account/_components/OrderHistoryList";
import { buildSignInUrl } from "@/lib/auth/urls";
import { getCurrentProxyUser } from "@/lib/server/backendProxy";
import { fetchOrdersForUser } from "@/lib/server/orderHistory";

export default async function AccountPage() {
  const user = await getCurrentProxyUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="store-panel rounded-[36px] px-6 py-10 sm:px-8">
          <p className="store-kicker">Account</p>
          <h1 className="store-display mt-4 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Sign in to keep your orders connected to you.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--copy-muted)]">
            Guest checkout still works, but account access gives you a durable place to revisit paid orders,
            continue into order detail pages, and keep shopping with clearer continuity.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={buildSignInUrl("/account")}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign in
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[var(--surface-muted)]"
            >
              Keep shopping
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const orders = await fetchOrdersForUser(user);
  const recentOrders = orders.slice(0, 4);
  const paidOrders = orders.filter((order) => order.status === "PAID");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="store-panel rounded-[36px] px-6 py-8 sm:px-8">
          <p className="store-kicker">Account overview</p>
          <h1 className="store-display mt-4 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Your orders, payment outcomes, and purchase history now live in one place.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--copy-muted)]">
            Signed-in order continuity is now visible product behavior instead of hidden infrastructure.
            Order detail pages remain backend-owned and owner-aware, while this account area gives returning
            customers a clean path back into them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/account/orders"
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              View full order history
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[var(--surface-muted)]"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <div className="store-panel rounded-[32px] p-6">
            <p className="text-sm text-[var(--copy-muted)]">Signed in as</p>
            <p className="mt-2 text-xl font-semibold text-zinc-950">{user.email ?? "Intelyi customer"}</p>
          </div>
          <div className="store-panel rounded-[32px] p-6">
            <p className="text-sm text-[var(--copy-muted)]">Total orders</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">{orders.length}</p>
          </div>
          <div className="overflow-hidden rounded-[32px] bg-zinc-950 p-6 text-zinc-100">
            <p className="text-sm uppercase tracking-[0.16em] text-zinc-500">Confirmed paid</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{paidOrders.length}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Paid orders remain backed by webhook-confirmed backend state, not frontend assumptions.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="store-kicker">Recent activity</p>
          <h2 className="store-display mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Your latest orders
          </h2>
        </div>
        {orders.length > 4 ? (
          <Link
            href="/account/orders"
            className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-[var(--surface-muted)]"
          >
            See all orders
          </Link>
        ) : null}
      </section>

      <OrderHistoryList
        orders={recentOrders}
        emptyTitle="Your account history will appear here after checkout."
        emptyCopy="Place an order while signed in and it will remain visible here as part of your account-owned purchase history."
      />
    </main>
  );
}
