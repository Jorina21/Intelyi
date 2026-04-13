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

export type CartContext = {
  user_id?: string | null;
  session_id?: string | null;
};

export type CartProductSummary = {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  brand: string | null;
  status: string;
};

export type CartItem = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  line_subtotal_cents: number;
  product: CartProductSummary;
};

export type Cart = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  status: string;
  items: CartItem[];
  total_item_count: number;
  cart_subtotal_cents: number;
  created_at: string;
  updated_at: string;
};

export type CartAddItemPayload = CartContext & {
  product_id: string;
  quantity: number;
};

export type CartUpdateItemPayload = CartContext & {
  quantity: number;
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

function buildCartQuery(context: CartContext) {
  const query = new URLSearchParams();

  if (context.user_id) {
    query.set("user_id", context.user_id);
  } else if (context.session_id) {
    query.set("session_id", context.session_id);
  }

  return query.toString();
}

async function parseJsonResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = (await res.json().catch(() => null)) as
    | { detail?: string; error?: string }
    | T
    | null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "detail" in data && typeof data.detail === "string" && data.detail) ||
      (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error) ||
      fallbackMessage;
    throw new Error(message);
  }

  return data as T;
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

export async function fetchCurrentCart(context: CartContext): Promise<Cart> {
  const queryString = buildCartQuery(context);
  const path = queryString ? `/api/cart?${queryString}` : "/api/cart";
  const res = await fetch(path, { cache: "no-store" });
  return parseJsonResponse<Cart>(res, "Failed to fetch cart");
}

export async function addItemToCart(payload: CartAddItemPayload): Promise<Cart> {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Cart>(res, "Failed to add item to cart");
}

export async function updateCartItem(itemId: string, payload: CartUpdateItemPayload): Promise<Cart> {
  const queryString = buildCartQuery(payload);
  const path = queryString ? `/api/cart/items/${itemId}?${queryString}` : `/api/cart/items/${itemId}`;
  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity: payload.quantity }),
  });
  return parseJsonResponse<Cart>(res, "Failed to update cart item");
}

export async function removeCartItem(itemId: string, context: CartContext): Promise<Cart> {
  const queryString = buildCartQuery(context);
  const path = queryString ? `/api/cart/items/${itemId}?${queryString}` : `/api/cart/items/${itemId}`;
  const res = await fetch(path, {
    method: "DELETE",
  });
  return parseJsonResponse<Cart>(res, "Failed to remove cart item");
}
