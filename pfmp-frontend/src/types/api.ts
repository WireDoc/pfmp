/**
 * Shared lightweight API types to incrementally replace `any`.
 * Keep intentionally minimal; expand only when a new field is used.
 */

// Generic success wrapper when backend returns a data envelope
export interface ApiResult<T> {
  data: T;
  status?: number; // optional if caller injects
  message?: string;
}

// Basic error shape (augment as real backend conventions emerge)
export interface ApiErrorShape {
  code?: string | number;
  message: string;
  details?: unknown;
  status?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Utility type: Either data or error (not both)
export type ApiResponse<T> = { ok: true; result: T } | { ok: false; error: ApiErrorShape };

// Lightweight HTTP method type
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Generic request config (subset of fetch RequestInit we actively use)
export interface RequestConfig<B = unknown> {
  method?: HttpMethod;
  body?: B;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// Normalized fetch function signature
export type Fetcher = <T = unknown>(url: string, config?: RequestConfig) => Promise<ApiResult<T>>;
