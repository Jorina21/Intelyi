const SESSION_STORAGE_KEY = "intelyi_session_id";

export function getOrCreateSessionId() {
  const existingSessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}
