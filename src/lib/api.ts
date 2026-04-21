import type { ApiResponse, PaginatedResponse } from './types';

const BASE_URL = '/api/v1';

// ==========================================
// Token management
// ==========================================

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mm_token');
}

export function setToken(token: string): void {
  localStorage.setItem('mm_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('mm_token');
}

// ==========================================
// Core fetch wrapper
// ==========================================

interface FetchOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, body, headers: customHeaders, ...rest } = options;

  // Build URL with query params
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — redirect to login
  if (res.status === 401) {
    removeToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    // Try to parse the error message from the backend, if available
    let errorMessage = 'Sesi telah berakhir, silakan login kembali';
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorMessage = errorJson.message;
    } catch (e) {
      // Ignored if not JSON
    }
    throw new ApiError(errorMessage, 401);
  }

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || 'Terjadi kesalahan', res.status);
  }

  return json as T;
}

// ==========================================
// Public API methods
// ==========================================

export const api = {
  get<T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'GET', params });
  },

  getPaginated<T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedResponse<T>> {
    return request<PaginatedResponse<T>>(endpoint, { method: 'GET', params });
  },

  post<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'POST', body });
  },

  put<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'PUT', body });
  },

  delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'DELETE' });
  },

  patch<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'PATCH', body });
  },


  upload<T = unknown>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { method: 'POST', body: formData });
  },
};

// ==========================================
// Error class
// ==========================================

export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
