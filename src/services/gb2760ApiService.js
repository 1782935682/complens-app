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

export async function fetchGb2760StagingRows({ status = '', q = '', ready = false, page = 1, limit = 20 } = {}) {
  const token = getToken({ redirectOnExpire: false });
  if (!token) {
    const error = new Error('GB 2760 staging review requires login');
    error.code = 'auth_required';
    throw error;
  }

  const params = new URLSearchParams();
  const normalizedStatus = String(status || '').trim();
  const normalizedQuery = String(q || '').trim();
  if (normalizedStatus) params.set('status', normalizedStatus);
  if (normalizedQuery) params.set('q', normalizedQuery);
  if (ready) params.set('ready', '1');
  params.set('page', String(Math.max(1, Number(page) || 1)));
  params.set('limit', String(Math.max(1, Number(limit) || 20)));

  return requestGb2760Json(`/gb2760/staging-rows?${params.toString()}`, token);
}

export async function updateGb2760StagingReviewStatus(id, reviewStatus) {
  const token = getToken({ redirectOnExpire: false });
  if (!token) {
    const error = new Error('GB 2760 staging review requires login');
    error.code = 'auth_required';
    throw error;
  }

  return requestGb2760Json(`/gb2760/staging-rows/${encodeURIComponent(id)}/review`, token, {
    method: 'PUT',
    body: JSON.stringify({ reviewStatus })
  });
}

export async function batchUpdateGb2760StagingReviewStatus(ids, reviewStatus) {
  const token = getToken({ redirectOnExpire: false });
  if (!token) {
    const error = new Error('GB 2760 staging review requires login');
    error.code = 'auth_required';
    throw error;
  }

  return requestGb2760Json('/gb2760/staging-rows/review', token, {
    method: 'PUT',
    body: JSON.stringify({ ids, reviewStatus })
  });
}

export async function updateGb2760StagingMapping(id, ingredientId, reviewStatus = 'mapped_candidate') {
  const token = getToken({ redirectOnExpire: false });
  if (!token) {
    const error = new Error('GB 2760 staging review requires login');
    error.code = 'auth_required';
    throw error;
  }

  return requestGb2760Json(`/gb2760/staging-rows/${encodeURIComponent(id)}/mapping`, token, {
    method: 'PUT',
    body: JSON.stringify({ ingredientId, reviewStatus })
  });
}

async function requestGb2760Json(path, token, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('GB 2760 API unavailable: fetch is not supported');
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      },
      signal: controller?.signal
    });
    if (!response.ok) {
      const body = await readErrorBody(response);
      const error = new Error(body?.message || `GB 2760 API request failed with ${response.status}`);
      error.status = response.status;
      error.code = body?.error || '';
      error.reasons = Array.isArray(body?.reasons) ? body.reasons : [];
      throw error;
    }
    return await response.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readErrorBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
