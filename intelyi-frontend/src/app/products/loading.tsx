export default function ProductsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="store-panel rounded-[36px] p-8">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
          <div className="mt-5 h-14 w-4/5 animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="store-panel rounded-[32px] p-6">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
              <div className="mt-4 h-10 w-24 animate-pulse rounded bg-zinc-200" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="store-panel mb-8 rounded-[36px] p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr),auto]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-10 w-28 animate-pulse rounded-full bg-zinc-200" />
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className="store-panel overflow-hidden rounded-[28px]">
            <div className="h-80 w-full animate-pulse bg-zinc-200" />
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
                <div className="h-6 w-5/6 animate-pulse rounded bg-zinc-200" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="flex items-end justify-between">
                <div className="h-10 w-24 animate-pulse rounded bg-zinc-200" />
                <div className="h-10 w-28 animate-pulse rounded-full bg-zinc-200" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
