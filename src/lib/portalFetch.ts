/**
 * Portal Fetch Helper
 * Wrapper around fetch for customer portal with:
 * - Auto Bearer token injection
 * - Silent token refresh on 401
 * - Force logout on refresh failure
 */

const TOKEN_KEY = "mmt_customer_token";
const REFRESH_KEY = "mmt_refresh_token";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch("/api/v1/customer-auth/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.success && data.data?.token) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      if (data.data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setPortalTokens(token: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearPortalTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function portalLogout() {
  clearPortalTokens();
  window.location.href = "/portal/login";
}

export async function portalFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = getPortalToken();
  if (!token) {
    portalLogout();
    return new Response(JSON.stringify({ success: false, message: "No token" }), { status: 401 });
  }

  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(url, { ...options, headers });

  // If 401, attempt silent refresh (only once concurrently)
  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = attemptRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await (refreshPromise || attemptRefresh());

    if (refreshed) {
      // Retry with new token
      const newToken = getPortalToken();
      const retryHeaders = new Headers(options?.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers: retryHeaders });
    } else {
      portalLogout();
    }
  }

  return res;
}

/**
 * Helper to do portalFetch and parse JSON in one call.
 * Returns { success, data, message } or throws.
 */
export async function portalApi<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data: T; message: string }> {
  const res = await portalFetch(url, options);
  return res.json();
}
