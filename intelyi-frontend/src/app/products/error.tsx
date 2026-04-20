"use client";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="store-panel rounded-[36px] border-red-200 bg-white p-8">
        <p className="store-kicker text-red-700">Storefront error</p>
        <h1 className="store-display mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Could not load products
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--copy-muted)]">
          {error.message || "Something went wrong while loading the storefront."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
