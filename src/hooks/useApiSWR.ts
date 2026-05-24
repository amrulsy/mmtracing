"use client";

import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr";
import { api, type ApiError } from "@/lib/api";
import type { ApiResponse, PaginatedResponse } from "@/lib/types";

/**
 * SWR fetcher that uses the existing api.get wrapper.
 */
async function apiFetcher<T>(endpoint: string): Promise<T> {
  const res = await api.get<T>(endpoint);
  return res.data;
}

/**
 * SWR fetcher for paginated responses.
 */
async function paginatedFetcher<T>(endpoint: string): Promise<PaginatedResponse<T>> {
  return api.getPaginated<T>(endpoint);
}

// ==========================================
// Generic SWR Hook
// ==========================================

/**
 * Hook for fetching API data with SWR. Automatically handles caching,
 * revalidation, and error retries.
 *
 * @param endpoint - API endpoint (e.g. "/spk", "/jasa")
 * @param params - Optional query params
 * @param config - Optional SWR configuration overrides
 */
export function useApiSWR<T>(
  endpoint: string | null,
  params?: Record<string, string | number | boolean | undefined>,
  config?: SWRConfiguration
) {
  // Build full URL with params
  const key = endpoint ? buildKey(endpoint, params) : null;

  return useSWR<T, ApiError>(
    key,
    (url: string) => apiFetcher<T>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      errorRetryCount: 3,
      ...config,
    }
  );
}

/**
 * Hook for fetching paginated API data with SWR.
 */
export function useApiPaginated<T>(
  endpoint: string | null,
  params?: Record<string, string | number | boolean | undefined>,
  config?: SWRConfiguration
) {
  const key = endpoint ? buildKey(endpoint, params) : null;

  return useSWR<PaginatedResponse<T>, ApiError>(
    key,
    (url: string) => paginatedFetcher<T>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      errorRetryCount: 3,
      ...config,
    }
  );
}

// ==========================================
// Mutation Helper — Auto-revalidate after mutate
// ==========================================

/**
 * Invalidate all SWR cache entries matching a prefix.
 * Call after a successful POST/PUT/DELETE to auto-refresh related views.
 *
 * Usage:
 *   await api.post('/spk', body);
 *   revalidateKeys('/spk');      // refreshes /spk list and any /spk/... detail
 *   revalidateKeys('/dashboard'); // refreshes dashboard after data change
 */
export function revalidateKeys(...prefixes: string[]) {
  globalMutate(
    (key) => {
      if (typeof key !== "string") return false;
      return prefixes.some((prefix) => key.startsWith(prefix));
    },
    undefined,
    { revalidate: true }
  );
}

/**
 * Shortcut: Perform a mutation (POST/PUT/DELETE) and auto-revalidate
 * related endpoints.
 */
export async function mutateAndRevalidate<T>(
  method: "post" | "put" | "delete" | "patch",
  endpoint: string,
  body?: unknown,
  revalidatePrefixes?: string[]
): Promise<ApiResponse<T>> {
  const result = await (api[method] as (endpoint: string, body?: unknown) => Promise<ApiResponse<T>>)(endpoint, body);

  // Auto-revalidate the base module + dashboard
  const basePath = "/" + endpoint.split("/").filter(Boolean)[0];
  const prefixes = revalidatePrefixes || [basePath, "/dashboard"];
  revalidateKeys(...prefixes);

  return result;
}

// ==========================================
// Helper
// ==========================================

function buildKey(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return endpoint;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}
