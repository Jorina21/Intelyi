function getFastApiBaseUrl() {
  const baseUrl = process.env.FASTAPI_BASE_URL;
  if (!baseUrl) {
    throw new Error("FASTAPI_BASE_URL is missing. Check .env and restart the dev server.");
  }
  return baseUrl;
}

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  status: string;
};

function toUrl(path: string) {
  const baseUrl = getFastApiBaseUrl();
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchPublicProducts(): Promise<PublicProduct[]> {
  const res = await fetch(toUrl("/products"), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch products (${res.status})`);
  }

  return (await res.json()) as PublicProduct[];
}

export async function fetchPublicProductById(id: string): Promise<PublicProduct | null> {
  const res = await fetch(toUrl(`/products/${id}`), { cache: "no-store" });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch product (${res.status})`);
  }

  return (await res.json()) as PublicProduct;
}
