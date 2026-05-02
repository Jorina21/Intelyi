import "server-only";

import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { prisma } from "@/lib/prisma";

export type ProxyUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
};

export function getFastApiBaseUrl() {
  return getApiBaseUrl();
}

export function getInternalProxyHeaders(userId?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "X-Intelyi-Internal-Token": process.env.INTERNAL_API_TOKEN ?? "intelyi-dev-internal-token",
  };

  if (userId) {
    headers["X-Intelyi-User-Id"] = userId;
  }

  return headers;
}

export async function getCurrentProxyUser(): Promise<ProxyUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, isAdmin: true },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function requireAdminProxyUser(): Promise<ProxyUser> {
  const user = await getCurrentProxyUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (!user.isAdmin) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export function normalizeOwnerPayload(payload: unknown, user: ProxyUser | null) {
  const raw = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const sessionId = typeof raw.session_id === "string" && raw.session_id ? raw.session_id : null;

  return {
    ...raw,
    user_id: user?.id ?? null,
    session_id: user ? sessionId : sessionId,
  };
}

export function buildOwnerQueryFromRequest(url: URL, user: ProxyUser | null) {
  const params = new URLSearchParams();
  const sessionId = url.searchParams.get("session_id");

  if (user) {
    params.set("user_id", user.id);
    if (sessionId) {
      params.set("session_id", sessionId);
    }
    return params;
  }

  if (sessionId) {
    params.set("session_id", sessionId);
  }

  return params;
}
