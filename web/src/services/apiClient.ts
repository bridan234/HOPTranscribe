import { API_BASE_URL, STORAGE_KEYS } from '@/constants/apiConstants';
import type { ApiResponse } from '@/types/api';

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

function authToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.authToken);
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (!(init.body instanceof FormData) && init.body !== undefined && headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = authToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();

  if (!response.ok) {
    let message = response.statusText;
    try {
      const parsed = text ? (JSON.parse(text) as ApiResponse<unknown>) : null;
      if (parsed?.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new ApiError(response.status, text, message);
  }

  if (!text) return undefined as T;
  const parsed = JSON.parse(text) as ApiResponse<T>;
  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    if (!parsed.success) throw new ApiError(response.status, text, parsed.error ?? 'Request failed.');
    return (parsed.data as T) ?? (undefined as T);
  }
  return parsed as unknown as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
