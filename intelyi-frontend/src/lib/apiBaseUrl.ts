function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.FASTAPI_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is missing. Set it in your frontend environment. FASTAPI_BASE_URL is still accepted as a fallback for legacy local setups.",
    );
  }

  return normalizeBaseUrl(baseUrl);
}
