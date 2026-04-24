const API_BASE = process.env.REACT_APP_API_URL || "";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body || {}) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body || {}) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me", { method: "GET" }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  refresh: () => request("/auth/refresh", { method: "POST" }),
  /** Consulter passeport complet par numéro + MRZ (DOUANE / POLICE). */
  lookupPassport: (num, mrz) => {
    const q = new URLSearchParams({ num, mrz }).toString();
    return request(`/passport/lookup?${q}`, { method: "GET" });
  },
  /** Get complete CIN history - all passports for a CIN */
  getCINHistory: (cin) => {
    return request(`/passport/history/cin/${encodeURIComponent(cin)}`, { method: "GET" });
  },
};

export function formatError(e) {
  if (!e) return "Erreur";
  if (e.data?.details) return `${e.message} — ${e.data.details}`;
  return e.message || "Erreur";
}

/** Réponse HTTP même si status 4xx/5xx (ex. /passport/verify). */
export async function fetchJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { ok: res.ok, status: res.status, data };
}
