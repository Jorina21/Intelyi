import "server-only";

import { getFastApiBaseUrl, getInternalProxyHeaders } from "@/lib/server/backendProxy";

export type RecommendationBreakdown = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  price_cents: number;
  score: number;
  personal_score: number;
  global_score: number;
  recommendation_reason: string | null;
  baseline_score: number;
  baseline_rank: number | null;
  current_rank: number | null;
  rank_delta: number | null;
  components: Record<string, number | string | null>;
};

export type RecommendationEvaluation = {
  context: {
    user_id?: string | null;
    session_id?: string | null;
    limit: number;
  };
  tuning: Record<string, number>;
  summary: {
    active_product_count: number;
    interaction_count: number;
    personal_interaction_count: number;
    strongest_personal_categories: string[];
    top_recommendation_count: number;
    average_score: number;
  };
  top_drivers: Array<{
    signal: string;
    impact: number;
    share: number;
  }>;
  baseline_comparison: {
    baseline_strategy: string;
    current_strategy: string;
    top_n: number;
    overlap_count: number;
    overlap_ratio: number;
    current_only_product_ids: string[];
    baseline_only_product_ids: string[];
    moved_up_products: string[];
  };
  recommendations: RecommendationBreakdown[];
  baseline_recommendations: RecommendationBreakdown[];
};

export type BundleDebugItem = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  price_cents: number;
  score: number;
  bundle_reason: string;
  debug?: Record<string, number | string | null> | null;
};

type EvaluationParams = {
  userId?: string | null;
  sessionId?: string | null;
  limit?: number;
};

function toQueryString(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

async function parseBackendJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : fallbackMessage;
    throw new Error(detail);
  }

  return data as T;
}

export async function fetchRecommendationEvaluation({
  userId,
  sessionId,
  limit = 8,
}: EvaluationParams): Promise<RecommendationEvaluation> {
  const queryString = toQueryString({
    user_id: userId,
    session_id: sessionId,
    limit,
  });
  const response = await fetch(`${getFastApiBaseUrl()}/recommendations/evaluate?${queryString}`, {
    cache: "no-store",
    headers: getInternalProxyHeaders(),
  });

  return parseBackendJson<RecommendationEvaluation>(response, "Failed to fetch recommendation evaluation");
}

export async function fetchBundleDebug(productId: string, limit = 4): Promise<BundleDebugItem[]> {
  const queryString = toQueryString({
    limit,
    debug: "true",
  });
  const response = await fetch(`${getFastApiBaseUrl()}/bundles/products/${productId}?${queryString}`, {
    cache: "no-store",
  });

  return parseBackendJson<BundleDebugItem[]>(response, "Failed to fetch bundle debug output");
}
