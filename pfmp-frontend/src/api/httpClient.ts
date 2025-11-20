import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { paths } from './generated/openapi-types';

// Basic axios instance (can add auth interceptors later)
export const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60 seconds for long-running analytics calculations
});

// Helper types to extract response body type from OpenAPI generated types
// Usage: ApiResponse<'/api/Advice/user/{userId}','get'>
type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';
type PathItem<P extends keyof paths> = paths[P];
type Operation<P extends keyof paths, M extends keyof PathItem<P>> = PathItem<P>[M];

type SuccessBodyFromOperation<Op> = Op extends { responses: infer R }
  ? 200 extends keyof R
    ? (R[200] extends { content: { 'application/json': infer T } } ? T : unknown)
    : 201 extends keyof R
      ? (R[201] extends { content: { 'application/json': infer T2 } } ? T2 : unknown)
      : unknown
  : unknown;

export type SuccessBody<P extends keyof paths, M extends keyof PathItem<P> & Method> = SuccessBodyFromOperation<Operation<P, M>>;

interface RequestParams<P extends keyof paths, M extends keyof PathItem<P> & Method> {
  path: P;
  method: M;
  // Path params must match the generated path param structure; user supplies mapping.
  // We'll do basic replacement for {param} tokens.
  params?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  config?: AxiosRequestConfig;
}

function buildUrl(pathTemplate: string, params?: Record<string, string | number>): string {
  if (!params) return pathTemplate;
  return pathTemplate.replace(/\{(.*?)\}/g, (_, key) => encodeURIComponent(String(params[key])));
}

function appendQuery(url: string, query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) return url;
  const q = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `${url}?${q}` : url;
}

export async function apiRequest<P extends keyof paths, M extends keyof PathItem<P> & Method>(
  { path, method, params, query, data, config }: RequestParams<P, M>
): Promise<SuccessBody<P, M>> {
  let url = buildUrl(path as string, params);
  url = appendQuery(url, query);
  const response = await http.request({ url, method: method as string, data, ...(config || {}) });
  return response.data as SuccessBody<P, M>;
}

// Example convenience wrapper (can expand):
export const AdviceApi = {
  listByUser(userId: number) {
    return apiRequest({ path: '/api/Advice/user/{userId}', method: 'get', params: { userId } });
  },
};
