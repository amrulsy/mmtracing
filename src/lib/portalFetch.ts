/**
 * Portal Fetch Helper
 * Wrapper around fetch for customer portal with:
 * - Auto Bearer token injection
 * - Silent token refresh on 401
 * - Force logout on refresh failure
 */

import { readApiJson } from './apiResponse';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let logoutInProgress = false;
let accessToken: string | null = null;

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/customer-auth/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The refresh credential is an HttpOnly cookie. It is intentionally never
      // exposed to JavaScript or persisted in localStorage.
      credentials: "same-origin",
      body: JSON.stringify({}),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.success && data.data?.token) {
      accessToken = data.data.token;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return accessToken;
}

/** Restore the short-lived access token from the HttpOnly refresh cookie. */
export async function restorePortalSession(): Promise<boolean> {
  if (accessToken) return true;
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = attemptRefresh().finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  }
  return refreshPromise ? await refreshPromise : false;
}

export function setPortalTokens(token: string) {
  accessToken = token;
}

export function clearPortalTokens() {
  accessToken = null;
}

export function portalLogout() {
  if (logoutInProgress) return;
  logoutInProgress = true;
  clearPortalTokens();
  // Keep the cookie server-owned, then ask the server to remove it before
  // navigating away. `keepalive` makes this reliable during page teardown.
  void fetch("/api/v1/customer-auth/logout", { method: "POST", credentials: "same-origin", keepalive: true });
  window.location.href = "/portal/login";
}

export async function portalFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  let token = getPortalToken();
  if (!token) {
    const refreshed = await restorePortalSession();
    token = getPortalToken();
    if (!refreshed || !token) {
      portalLogout();
      return new Response(JSON.stringify({ success: false, message: "No active session" }), { status: 401 });
    }
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

    const refreshed = refreshPromise ? await refreshPromise : await attemptRefresh();

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

  // Intercept HTML errors (e.g., 500 Server Error) to prevent JSON.parse crash
  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      return new Response(JSON.stringify({ success: false, message: "Terjadi kesalahan pada server. Silakan coba lagi nanti." }), { status: res.status, headers: { "Content-Type": "application/json" } });
    }
  }

  return res;
}

/**
 * Helper to do portalFetch and parse JSON in one call.
 * Returns { success, data, message } or throws.
 */
export async function portalApi<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data: T; message: string }> {
  const res = await portalFetch(url, options);
  return readApiJson(res);
}
