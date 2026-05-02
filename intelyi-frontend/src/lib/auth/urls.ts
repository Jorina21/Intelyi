const DEFAULT_SIGN_IN_REDIRECT = "/account";

function normalizePath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export function normalizeAuthCallbackUrl(value?: string | null) {
  if (!value) {
    return DEFAULT_SIGN_IN_REDIRECT;
  }

  const normalizedPath = normalizePath(value);
  if (normalizedPath) {
    return normalizedPath.startsWith("/api/auth") || normalizedPath === "/sign-in" || normalizedPath === "/sign-up"
      ? DEFAULT_SIGN_IN_REDIRECT
      : normalizedPath;
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname !== "localhost") {
      return DEFAULT_SIGN_IN_REDIRECT;
    }

    return normalizeAuthCallbackUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`);
  } catch {
    return DEFAULT_SIGN_IN_REDIRECT;
  }
}

export function buildSignInUrl(callbackUrl?: string | null) {
  const safeCallbackUrl = normalizeAuthCallbackUrl(callbackUrl);
  return `/sign-in?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
}
