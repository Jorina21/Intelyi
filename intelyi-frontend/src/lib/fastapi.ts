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

export type InteractionCreate = {
  product_id: string;
  user_id?: string | null;
  session_id?: string | null;
  event_type: string;
  event_value?: number | null;
};

export type Interaction = {
  id: string;
  product_id: string;
  user_id: string | null;
  session_id: string | null;
  event_type: string;
  event_value: number | null;
  created_at: string;
};

export type RecommendedProduct = PublicProduct & {
  score: number;
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

export async function fetchRecommendedProducts(): Promise<RecommendedProduct[]> {
  const res = await fetch(toUrl("/recommendations"), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch recommendations (${res.status})`);
  }

  return (await res.json()) as RecommendedProduct[];
}

export async function logInteraction(payload: InteractionCreate): Promise<Interaction | null> {
  const res = await fetch("/api/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as Interaction;
}
