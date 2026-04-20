import Link from "next/link";

import HomeRecommendations from "@/app/_components/HomeRecommendations";
import ProductCard from "@/app/_components/ProductCard";
import ProductRail from "@/app/_components/ProductRail";
import { fetchProductCategories, fetchPublicProducts, fetchRecommendedProducts } from "@/lib/fastapi";

function buildCategoryShowcase(categories: string[], products: Awaited<ReturnType<typeof fetchPublicProducts>>) {
  return categories
    .slice(0, 6)
    .map((category) => ({
      category,
      sample: products.find((product) => product.category === category),
    }))
    .filter((item) => item.sample);
}

export default async function Home() {
  const [recommendedProducts, allProducts, categories] = await Promise.all([
    fetchRecommendedProducts({ limit: 6 }),
    fetchPublicProducts({ status: "ACTIVE", sort: "newest" }),
    fetchProductCategories("ACTIVE"),
  ]);

  const spotlightProduct = recommendedProducts[0] ?? allProducts[0];
  const newestProducts = allProducts.slice(0, 8);
  const valueProducts = [...allProducts].sort((left, right) => left.price_cents - right.price_cents).slice(0, 8);
  const categoryShowcase = buildCategoryShowcase(categories, allProducts);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
        <div className="store-panel rounded-[36px] px-6 py-8 sm:px-8 sm:py-10">
          <p className="store-kicker">Curated commerce interface</p>
          <h1 className="store-display mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-zinc-950 sm:text-6xl">
            A lighter, denser storefront built to merchandise a broader catalog.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--copy-muted)] sm:text-lg">
            Intelyi now presents backend-ranked recommendations, expanded catalog breadth, and category discovery through a premium light-theme shopping interface with stronger hierarchy and product emphasis.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Browse the catalog
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-[var(--surface-muted)]"
            >
              View merchandising analytics
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] bg-[var(--surface-muted)] p-4">
              <p className="text-sm text-[var(--copy-muted)]">Live categories</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">{categories.length}</p>
            </div>
            <div className="rounded-[24px] bg-[var(--surface-muted)] p-4">
              <p className="text-sm text-[var(--copy-muted)]">Active products</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">{allProducts.length}</p>
            </div>
            <div className="rounded-[24px] bg-[var(--surface-muted)] p-4">
              <p className="text-sm text-[var(--copy-muted)]">Homepage recommendations</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-950">{recommendedProducts.length}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="overflow-hidden rounded-[36px] bg-zinc-950 p-6 text-zinc-100 shadow-[0_24px_60px_rgba(17,17,17,0.26)]">
            <p className="store-kicker !text-zinc-500">Spotlight product</p>
            {spotlightProduct ? (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    {spotlightProduct.category || spotlightProduct.brand || "Curated feature"}
                  </p>
                  <h2 className="store-display text-3xl font-semibold leading-tight text-white">
                    {spotlightProduct.name}
                  </h2>
                  <p className="line-clamp-3 text-sm leading-6 text-zinc-400">
                    {spotlightProduct.description}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Starting at</p>
                    <p className="text-3xl font-semibold text-white">
                      ${(spotlightProduct.price_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/products/${spotlightProduct.id}`}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
                  >
                    View feature
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">The catalog spotlight will appear as products become available.</p>
            )}
          </div>

          <div className="store-panel rounded-[36px] p-6">
            <p className="store-kicker">Category browse</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {categoryShowcase.map(({ category, sample }) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-[var(--surface-muted)]"
                >
                  {category}
                  <span className="ml-2 text-[var(--copy-muted)]">
                    {sample?.brand || "shop"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="store-panel rounded-[32px] p-6">
          <p className="store-kicker">Modular discovery</p>
          <h2 className="store-display mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            Browse by category without losing density.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--copy-muted)]">
            The light-theme merchandising grid keeps metadata, pricing, and product photography visible while preserving backend-owned search, category filtering, and add-to-cart interactions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryShowcase.slice(0, 3).map(({ category, sample }) =>
            sample ? (
              <ProductCard
                key={category}
                product={sample}
                variant="compact"
              />
            ) : null,
          )}
        </div>
      </section>

      <HomeRecommendations initialProducts={recommendedProducts} />

      <ProductRail
        title="Fresh across the catalog"
        subtitle="A horizontal row of newer additions keeps the homepage feeling merchandised, fast to scan, and consistent with the redesigned product cards."
        products={newestProducts}
      />

      <ProductRail
        title="Accessible price points"
        subtitle="High-density product shelves work well for value-focused browsing without flattening the visual system into a plain list."
        products={valueProducts}
      />
    </main>
  );
}
