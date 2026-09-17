"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { portalFetch, portalLogout, getPortalToken } from "@/lib/portalFetch";

/**
 * Centralized hook for portal API calls.
 * Handles loading, error (network-aware), auto-refetch interval, and manual refresh.
 *
 * Key behavior:
 * - On 401/403 → portalLogout() (auth error)
 * - On network error / 5xx → shows retry UI instead of logging out
 */
export function usePortalApi<T = unknown>(
  url: string | null,
  options?: {
    /** Auto-refetch interval in ms. 0 = disabled. */
    refetchInterval?: number;
    /** Request options for fetch */
    fetchOptions?: RequestInit;
    /** Skip initial fetch (for conditional fetching) */
    skip?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<{ type: "auth" | "network" | "server"; message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!url) return;
      if (showLoader && !data) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const res = await portalFetch(url, options?.fetchOptions);

        if (!mountedRef.current) return;

        if (res.status === 401 || res.status === 403) {
          portalLogout();
          return;
        }

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({ message: "Server error" }));
          setError({
            type: "server",
            message: errorBody.message || `Error ${res.status}`,
          });
          return;
        }

        const json = await res.json();

        if (!mountedRef.current) return;

        if (json.success) {
          setData(json.data);
        } else if (json.message?.toLowerCase().includes("token") || json.message?.toLowerCase().includes("auth")) {
          portalLogout();
        } else {
          setError({ type: "server", message: json.message || "Gagal memuat data" });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        // Network error — don't logout, show retry
        setError({
          type: "network",
          message: "Koneksi bermasalah. Periksa internet Anda dan coba lagi.",
        });
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url]
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!options?.skip) fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, options?.skip]);

  // Auto-refetch interval
  useEffect(() => {
    if (!options?.refetchInterval || options.refetchInterval <= 0 || options?.skip) return;
    const interval = setInterval(() => fetchData(false), options.refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval, options?.skip]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    refetch: () => fetchData(false),
    reload: () => fetchData(true),
  };
}

/**
 * Centralized hook for unread notification count.
 * Polls the backend every 60 seconds. Shared across components via this single hook.
 * Uses a module-level cache so multiple instances don't duplicate requests.
 */

let globalUnreadCount = 0;
let globalListeners: Set<(count: number) => void> = new Set();
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

async function pollUnread() {
  try {
    const token = getPortalToken();
    if (!token) return;

    const res = await portalFetch("/api/v1/customer-auth/notifikasi?limit=1");
    const data = await res.json();
    if (data.success && typeof data.data?.unreadCount === "number") {
      globalUnreadCount = data.data.unreadCount;
      globalListeners.forEach((fn) => fn(globalUnreadCount));
    }
  } catch {
    /* ignore polling errors */
  }
}

function startPolling() {
  if (isPolling) return;
  isPolling = true;
  pollUnread();
  pollingInterval = setInterval(pollUnread, 60000);
}

function stopPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = null;
  isPolling = false;
}

export function useUnreadCount() {
  const [count, setCount] = useState(globalUnreadCount);

  useEffect(() => {
    globalListeners.add(setCount);
    startPolling();

    return () => {
      globalListeners.delete(setCount);
      if (globalListeners.size === 0) stopPolling();
    };
  }, []);

  /** Force refresh from any component */
  const refresh = useCallback(() => {
    pollUnread();
  }, []);

  return { unreadCount: count, refreshUnread: refresh };
}
