import Link from "next/link";

import { getCurrentProxyUser } from "@/lib/server/backendProxy";

const primaryLinks = [
  { href: "/products", label: "Shop" },
  { href: "/cart", label: "Cart" },
  { href: "/analytics", label: "Analytics" },
];

export default async function StorefrontHeader() {
  const user = await getCurrentProxyUser();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_16px_40px_rgba(17,17,17,0.22)]">
      <div className="border-b border-zinc-800/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-400 sm:px-6">
          <span>Intelyi Commerce</span>
          <span className="hidden md:inline">AI-informed merchandising, backend-owned discovery</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="min-w-fit">
              <div className="flex flex-col">
                <span className="store-kicker !text-zinc-500">Storefront</span>
                <span className="store-display text-3xl font-semibold tracking-tight text-white">
                  Intelyi
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-4 text-sm font-medium text-zinc-300 lg:hidden">
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
              <Link href="/account" className="hover:text-white">
                {user ? "Account" : "Sign in"}
              </Link>
            </nav>
          </div>

          <form
            action="/products"
            className="flex flex-1 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <input
              type="search"
              name="q"
              placeholder="Search products, brands, and catalog categories"
              className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <button
              type="submit"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
            >
              Search
            </button>
          </form>

          <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-300 lg:flex">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
            <Link href="/account" className="hover:text-white">
              {user ? "Account" : "Sign in"}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
