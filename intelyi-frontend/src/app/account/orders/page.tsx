import Link from "next/link";

import OrderHistoryList from "@/app/account/_components/OrderHistoryList";
import { buildSignInUrl } from "@/lib/auth/urls";
import { getCurrentProxyUser } from "@/lib/server/backendProxy";
import { fetchOrdersForUser } from "@/lib/server/orderHistory";

export default async function AccountOrdersPage() {
  const user = await getCurrentProxyUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="store-panel rounded-[36px] px-6 py-10 sm:px-8">
          <p className="store-kicker">Order history</p>
          <h1 className="store-display mt-4 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Sign in to view account-owned orders.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--copy-muted)]">
            Guest orders still remain usable through their direct order pages, but a full reusable history is only
            available through signed-in account ownership.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={buildSignInUrl("/account/orders")}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign in
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[var(--surface-muted)]"
            >
              Browse products
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const orders = await fetchOrdersForUser(user);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="store-panel rounded-[36px] px-6 py-8 sm:px-8">
          <p className="store-kicker">Order history</p>
          <h1 className="store-display mt-4 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Review everything you have already bought through your account.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--copy-muted)]">
            This page lists backend-owned orders for the current signed-in customer and links directly into the
            same secure order detail route used during checkout and post-purchase.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="store-panel rounded-[32px] p-6">
            <p className="text-sm text-[var(--copy-muted)]">Account</p>
            <p className="mt-2 text-xl font-semibold text-zinc-950">{user.email ?? "Intelyi customer"}</p>
          </div>
          <div className="overflow-hidden rounded-[32px] bg-zinc-950 p-6 text-zinc-100">
            <p className="text-sm uppercase tracking-[0.16em] text-zinc-500">Visible orders</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{orders.length}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Owner context still controls visibility. Direct order ids are not enough to access another user’s orders.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/account"
          className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-[var(--surface-muted)]"
        >
          Back to account
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-[var(--surface-muted)]"
        >
          Continue shopping
        </Link>
      </div>

      <OrderHistoryList
        orders={orders}
        emptyTitle="Your signed-in order history is ready for your first purchase."
        emptyCopy="Once a signed-in checkout creates or claims an order, it will appear here with a durable path back into order details."
      />
    </main>
  );
}
