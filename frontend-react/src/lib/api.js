const API_BASE = import.meta.env.VITE_API_URL || "";

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * apiFetch — saari backend calls isi se guzarti hain.
 * `credentials: "include"` zaroori hai — isके bina browser cross-domain
 * request (Vercel -> Render) ke saath session cookie bhejta hi nahi.
 * CSRF token cookie se padha jaata hai aur header me bheja jaata hai —
 * yeh Django ka standard AJAX CSRF pattern hai.
 */
async function apiFetch(path, options = {}) {
  const csrfToken = getCookie("csrftoken");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(options.headers || {}),
    },
  });

  let body = null;
  try { body = await res.json(); } catch { /* empty body, e.g. some errors */ }

  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  base: API_BASE,
  enabled: Boolean(API_BASE),

  primeCsrf: () => apiFetch("/accounts/api/csrf/"),
  me: () => apiFetch("/accounts/api/me/"),
  signup: (username, password) =>
    apiFetch("/accounts/api/signup/", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    apiFetch("/accounts/api/login/", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => apiFetch("/accounts/api/logout/", { method: "POST" }),
  history: () => apiFetch("/api/history/"),
  reportUrl: (sessionId) => `${API_BASE}/report/${sessionId}/download/`,
};
