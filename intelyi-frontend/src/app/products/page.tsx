import Link from "next/link";

import ProductCard from "@/app/_components/ProductCard";
import { fetchProductCategories, fetchPublicProducts, type ProductSearchParams } from "@/lib/fastapi";

type ProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearchParams(raw: Record<string, string | string[] | undefined>): ProductSearchParams {
  const q = readSingleValue(raw.q)?.trim() || undefined;
  const category = readSingleValue(raw.category)?.trim() || undefined;
  const sort = readSingleValue(raw.sort);

  if (sort === "price_asc" || sort === "price_desc" || sort === "name_asc" || sort === "newest") {
    return { q, category, status: "ACTIVE", sort };
  }

  return { q, category, status: "ACTIVE", sort: "newest" };
}

function buildCategoryHref(category: string, filters: ProductSearchParams) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  params.set("category", category);

  return `/products?${params.toString()}`;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = normalizeSearchParams(resolvedSearchParams);
  const [products, categories] = await Promise.all([
    fetchPublicProducts(filters),
    fetchProductCategories("ACTIVE"),
  ]);

  const hasActiveFilters = Boolean(filters.q || filters.category || (filters.sort && filters.sort !== "newest"));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="store-panel rounded-[36px] px-6 py-8 sm:px-8">
          <p className="store-kicker">Catalog browse</p>
          <h1 className="store-display mt-4 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Shop the full storefront with better visual rhythm and stronger product hierarchy.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--copy-muted)]">
            Backend-powered search and filtering still drive this page. The redesign improves scanability with modular panels, quicker category hopping, clearer pricing, and product-forward cards.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="store-panel rounded-[32px] p-6">
            <p className="text-sm text-[var(--copy-muted)]">Visible categories</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">{categories.length}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--copy-muted)]">
              Normalized internal categories make search and browsing feel coherent across the broader catalog.
            </p>
          </div>
          <div className="overflow-hidden rounded-[32px] bg-zinc-950 p-6 text-zinc-100">
            <p className="text-sm uppercase tracking-[0.16em] text-zinc-500">Results</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{products.length}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {hasActiveFilters
                ? `Showing filtered results${filters.category ? ` in ${filters.category}` : ""}${filters.q ? ` for "${filters.q}"` : ""}.`
                : "Showing all active products in the redesigned storefront grid."}
            </p>
          </div>
        </div>
      </section>

      <section className="store-panel rounded-[36px] p-5 sm:p-6">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr),auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Search the catalog</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Search by product name, description, or brand"
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">Category</span>
              <select
                name="category"
                defaultValue={filters.category ?? ""}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">Sort</span>
              <select
                name="sort"
                defaultValue={filters.sort ?? "newest"}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="newest">Newest</option>
                <option value="name_asc">Name A-Z</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Apply filters
            </button>
            <Link
              href="/products"
              className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-[var(--surface-muted)]"
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-5 -mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-full gap-2">
            <Link
              href="/products"
              className={`rounded-full px-4 py-2 text-sm font-medium ${!filters.category ? "bg-zinc-950 text-white" : "border border-[var(--border)] bg-white text-zinc-800 hover:bg-[var(--surface-muted)]"}`}
            >
              All categories
            </Link>
            {categories.map((category) => {
              const isActive = filters.category === category;
              return (
                <Link
                  key={category}
                  href={buildCategoryHref(category, filters)}
                  className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${isActive ? "bg-zinc-950 text-white" : "border border-[var(--border)] bg-white text-zinc-800 hover:bg-[var(--surface-muted)]"}`}
                >
                  {category}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {products.length === 0 ? (
        <section className="store-panel rounded-[36px] p-10 text-center">
          <p className="store-kicker">No match</p>
          <h2 className="store-display mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            No products matched this search.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--copy-muted)]">
            Try a different keyword, clear the current category, or reset the sorting controls to widen the storefront results.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </main>
  );
}
