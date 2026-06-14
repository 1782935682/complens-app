import { getToken } from './authService.js';
import { getApiBaseUrl } from './storageService.js';

const REQUEST_TIMEOUT_MS = 5000;

export async function fetchGb2760ReferenceRows({ table = '', q = '', page = 1, limit = 20 } = {}) {
  const token = getToken({ redirectOnExpire: false });
  if (!token) {
    const error = new Error('GB 2760 reference rows require login');
    error.code = 'auth_required';
    throw error;
  }

  const params = new URLSearchParams();
  const normalizedTable = String(table || '').trim();
  const normalizedQuery = String(q || '').trim();
  if (normalizedTable) params.set('table', normalizedTable);
  if (normalizedQuery) params.set('q', normalizedQuery);
  params.set('page', String(Math.max(1, Number(page) || 1)));
  params.set('limit', String(Math.max(1, Number(limit) || 20)));

  return requestGb2760Json(`/gb2760/reference-rows?${params.toString()}`, token);
}

async function requestGb2760Json(path, token) {
  if (typeof fetch !== 'function') {
    throw new Error('GB 2760 API unavailable: fetch is not supported');
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      signal: controller?.signal
    });
    if (!response.ok) {
      const error = new Error(`GB 2760 API request failed with ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
