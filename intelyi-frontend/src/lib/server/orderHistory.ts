import "server-only";

import type { Order } from "@/lib/fastapi";

import { getFastApiBaseUrl, getInternalProxyHeaders, type ProxyUser } from "./backendProxy";

export async function fetchOrdersForUser(user: ProxyUser): Promise<Order[]> {
  const query = new URLSearchParams({ user_id: user.id }).toString();
  const response = await fetch(`${getFastApiBaseUrl()}/orders?${query}`, {
    cache: "no-store",
    headers: getInternalProxyHeaders(user.id),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch order history (${response.status})`);
  }

  return (await response.json()) as Order[];
}
