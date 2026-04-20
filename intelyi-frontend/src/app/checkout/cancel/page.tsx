import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const params = await searchParams;
  const orderHref = params.order_id ? `/orders/${params.order_id}` : "/cart";

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="rounded-2xl border bg-white p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">Checkout</p>
        <h1 className="mt-2 text-3xl font-bold">Payment was canceled</h1>
        <p className="mt-3 text-gray-600">
          No purchase has been confirmed. You can return to your order summary or cart and try again.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={orderHref}
            className="inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Return to order
          </Link>
          <Link
            href="/cart"
            className="inline-flex rounded-full border px-5 py-3 text-sm font-medium transition hover:bg-zinc-100"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </main>
  );
}
