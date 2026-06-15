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
const AUTH_TOKEN_KEY = 'compcheck:auth-token';
const DEFAULT_H5_API_BASE_URL = '/api';
const PUBLIC_API_BASE_URL = normalizeApiBaseUrl(__COMPLENS_USER_API_BASE_URL__);
const DEFAULT_TIMEOUT_MS = 8000;

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(readString(API_BASE_URL_KEY, getDefaultApiBaseUrl()));
}

export function setApiBaseUrl(value: string): void {
  writeString(API_BASE_URL_KEY, normalizeApiBaseUrl(value) || getDefaultApiBaseUrl());
}

export async function requestJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = buildRequestUrl(path);
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
        ...buildAuthHeader(),
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

function buildRequestUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw createApiError('api_base_url_required', '非 H5 平台需要配置 USER_API_BASE_URL 后才能访问后端 API。');
  }
  if (requiresAbsoluteApiBaseUrl() && !/^https?:\/\//i.test(baseUrl)) {
    throw createApiError('api_base_url_required', '非 H5 平台需要配置绝对后端 API 地址。');
  }
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function getDefaultApiBaseUrl(): string {
  // #ifdef H5
  return PUBLIC_API_BASE_URL || DEFAULT_H5_API_BASE_URL;
  // #endif
  return PUBLIC_API_BASE_URL;
}

function requiresAbsoluteApiBaseUrl(): boolean {
  // #ifdef H5
  return false;
  // #endif
  return true;
}

function normalizeApiBaseUrl(value: string): string {
  return String(value || '').trim().replace(/\/$/, '');
}

function createApiError(code: string, message: string): ApiError {
  const error = new Error(message) as ApiError;
  error.code = code;
  return error;
}

function buildAuthHeader(): Record<string, string> {
  const token = getApiAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getApiAuthToken(): string {
  const token = readString(AUTH_TOKEN_KEY).trim();
  return isValidJwt(token) ? token : '';
}

function isValidJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(Boolean);
}

function isPlainObject(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
