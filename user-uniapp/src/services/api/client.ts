import { readString, writeString } from '@/platform/storage';

export interface ApiError extends Error {
  status?: number;
  code: string;
  isTimeout?: boolean;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

const API_BASE_URL_KEY = 'complens:user-api-base-url';
const DEFAULT_API_BASE_URL = '/api';
const DEFAULT_TIMEOUT_MS = 8000;

export function getApiBaseUrl(): string {
  return readString(API_BASE_URL_KEY, DEFAULT_API_BASE_URL).replace(/\/$/, '') || DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(value: string): void {
  writeString(API_BASE_URL_KEY, value.trim() || DEFAULT_API_BASE_URL);
}

export async function requestJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const method = options.method || 'GET';
  const timeout = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      url,
      method,
      data: options.data as UniApp.RequestOptions['data'],
      timeout,
      header: {
        Accept: 'application/json',
        ...(options.data ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      },
      success: resolve,
      fail: reject
    });
  }).catch((error) => {
    const apiError = new Error(normalizeRequestError(error)) as ApiError;
    apiError.code = error?.errMsg?.includes('timeout') ? 'timeout' : 'network_error';
    apiError.isTimeout = apiError.code === 'timeout';
    throw apiError;
  });

  const statusCode = Number(response.statusCode) || 0;
  if (statusCode < 200 || statusCode >= 300) {
    const payload = isPlainObject(response.data) ? response.data : {};
    const apiError = new Error(String(payload.message || payload.error || `request_failed_${statusCode}`)) as ApiError;
    apiError.status = statusCode;
    apiError.code = String(payload.error || `http_${statusCode}`);
    throw apiError;
  }

  return response.data as T;
}

function normalizeRequestError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String((error as { errMsg?: string })?.errMsg || 'network_error');
}

function isPlainObject(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
