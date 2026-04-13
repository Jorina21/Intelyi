const SESSION_STORAGE_KEY = "intelyi_cart_session_id";

export function getOrCreateSessionId() {
  if (typeof window === "undefined") {
    throw new Error("Session ID can only be accessed in the browser.");
  }

  const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

export function clearSessionId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
