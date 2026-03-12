import Image from "next/image";
import Link from "next/link";
import { fetchRecommendedProducts } from "@/lib/fastapi";

export default async function Home() {
  const recommendedProducts = await fetchRecommendedProducts();
  const products = recommendedProducts.filter((product) => product.status === "ACTIVE").slice(0, 3);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between gap-12 py-24 px-16 bg-white dark:bg-black sm:items-start">
        {/* Logo */}
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        {/* Intelyi content */}
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-md text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Intelyi
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Capstone project: an <span className="font-medium text-zinc-950 dark:text-zinc-50">
              AI-driven merchandising engine
            </span>{" "}
            for adaptive e-commerce.  
            The storefront is the interface — intelligence runs the store.
          </p>
        </div>

        {/* Navigation actions */}
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/products"
            className="flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 md:w-[158px]"
          >
            Browse Products
          </Link>

          <Link
            href="/api/auth/signin"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
          >
            Sign In
          </Link>
        </div>

        <section className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              Recommended Products
            </h2>
            <Link className="underline text-sm" href="/products">
              View all
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No recommendations yet. Interactions will start shaping product ranking as people browse.
            </p>
          ) : (
            <ul className="grid gap-4">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-black dark:text-zinc-50">{product.name}</h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {product.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-medium text-black dark:text-zinc-50">
                        ${(product.price_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Score: {product.score}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
