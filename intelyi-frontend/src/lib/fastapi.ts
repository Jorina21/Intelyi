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
  image_url: string | null;
  category: string | null;
  brand: string | null;
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
  personal_score: number;
  global_score: number;
};

export type ProductAnalytics = {
  product_id: string;
  name: string;
  views: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  score: number;
  ctr: number;
};

function toUrl(path: string) {
  const baseUrl = getFastApiBaseUrl();
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function toRecommendationUrl(path: string) {
  if (typeof window !== "undefined") {
    return path.startsWith("/") ? `/api${path}` : `/api/${path}`;
  }

  return toUrl(path);
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

type RecommendationContext = {
  user_id?: string;
  session_id?: string;
  limit?: number;
};

export async function fetchRecommendedProducts(
  context: RecommendationContext = {},
): Promise<RecommendedProduct[]> {
  const query = new URLSearchParams();

  if (context.user_id) {
    query.set("user_id", context.user_id);
  } else if (context.session_id) {
    query.set("session_id", context.session_id);
  }

  if (typeof context.limit === "number") {
    query.set("limit", String(context.limit));
  }

  const queryString = query.toString();
  const path = queryString ? `/recommendations?${queryString}` : "/recommendations";
  const res = await fetch(toRecommendationUrl(path), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch recommendations (${res.status})`);
  }

  return (await res.json()) as RecommendedProduct[];
}

export async function getProductAnalytics(): Promise<ProductAnalytics[]> {
  const res = await fetch(toUrl("/analytics/products"), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch product analytics (${res.status})`);
  }

  return (await res.json()) as ProductAnalytics[];
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
