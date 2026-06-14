const API_BASE_URL_KEY = 'compcheck:api-base-url';
const DEFAULT_API_BASE_URL = '/api';
const REQUEST_TIMEOUT_MS = 3500;

export async function fetchIngredientSearch({ query = '', filters = {}, page = 1, limit = 20, sort = '' } = {}) {
  const params = new URLSearchParams();
  const normalizedQuery = String(query || '').trim();
  const ingredientCategory = String(filters?.ingredientCategory || '').trim();
  const riskLevel = String(filters?.risk || '').trim();
  const confidenceLevel = String(filters?.confidenceLevel || '').trim();
  const normalizedSort = String(sort || '').trim();

  if (normalizedQuery) params.set('q', normalizedQuery);
  if (ingredientCategory) params.set('category', ingredientCategory);
  if (riskLevel) params.set('riskLevel', riskLevel);
  if (confidenceLevel) params.set('confidenceLevel', confidenceLevel);
  if (normalizedSort) params.set('sort', normalizedSort);
  params.set('page', String(Math.max(1, Number(page) || 1)));
  params.set('limit', String(Math.max(1, Number(limit) || 20)));

  return requestIngredientJson(`/ingredients/search?${params.toString()}`);
}

export async function fetchIngredientById(id, options = {}) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return null;
  const params = new URLSearchParams();
  if (options.includeEvidence) params.set('includeEvidence', '1');
  const suffix = params.toString();
  return requestIngredientJson(`/ingredients/${encodeURIComponent(normalizedId)}${suffix ? `?${suffix}` : ''}`);
}

export async function fetchIngredientCategories() {
  return requestIngredientJson('/ingredients/categories');
}

export async function fetchIngredientBatchSearch(terms = []) {
  const normalizedTerms = Array.isArray(terms)
    ? terms.map((term) => String(term || '').trim()).filter(Boolean).slice(0, 200)
    : [];
  if (!normalizedTerms.length) return { results: [] };
  return requestIngredientJson('/ingredients/batch-search', {
    method: 'POST',
    body: JSON.stringify({ terms: normalizedTerms, includeENumbers: true })
  });
}

async function requestIngredientJson(path, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Ingredient API unavailable: fetch is not supported');
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: { Accept: 'application/json' },
      ...(options.body ? { headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers } } : {}),
      signal: controller?.signal
    });
    if (!response.ok) {
      const error = new Error(`Ingredient API request failed with ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function getApiBaseUrl() {
  const configured = readRaw(API_BASE_URL_KEY);
  return String(configured || DEFAULT_API_BASE_URL).trim().replace(/\/$/, '') || DEFAULT_API_BASE_URL;
}

function readRaw(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    return '';
  }
  return '';
}
