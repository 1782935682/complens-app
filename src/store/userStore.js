import { getIngredientById } from '../services/ingredientService.js';
import { readJson, writeJson } from '../services/storageService.js';

const FAVORITES_KEY = 'compcheck:favorites';
const HISTORY_KEY = 'compcheck:history';
const ALLERGENS_KEY = 'compcheck:allergens';
const MAX_HISTORY = 8;
const DEFAULT_CATEGORY = 'cosmetics';

export function getFavoriteItems() {
  return readJson(FAVORITES_KEY, [])
    .map(normalizeFavoriteItem)
    .filter(Boolean);
}

export function getFavoriteIds(category = DEFAULT_CATEGORY) {
  return getFavoriteItems()
    .filter((item) => item.category === category)
    .map((item) => item.id);
}

export function getFavoriteIngredients(category = DEFAULT_CATEGORY) {
  return getFavoriteItems()
    .filter((item) => item.category === category)
    .map((item) => getIngredientById(item.id, item.category))
    .filter(Boolean);
}

export function toggleFavorite(id, category = DEFAULT_CATEGORY) {
  const current = getFavoriteItems();
  const exists = current.some((item) => item.id === id && item.category === category);
  const next = exists
    ? current.filter((item) => item.id !== id || item.category !== category)
    : [{ id, category }, ...current];
  writeJson(FAVORITES_KEY, next);
  return next;
}

export function isFavorite(id, category = DEFAULT_CATEGORY) {
  return getFavoriteItems().some((item) => item.id === id && item.category === category);
}

export function getHistory() {
  return readJson(HISTORY_KEY, []);
}

export function addHistory(query) {
  const normalized = String(query || '').trim();
  if (!normalized) return getHistory();
  const next = [
    normalized,
    ...getHistory().filter((item) => item !== normalized)
  ].slice(0, MAX_HISTORY);
  writeJson(HISTORY_KEY, next);
  return next;
}

export function clearHistory() {
  writeJson(HISTORY_KEY, []);
}

export function getUserAllergens() {
  return readJson(ALLERGENS_KEY, []);
}

export function setUserAllergens(ids) {
  const next = [...new Set((Array.isArray(ids) ? ids : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
  writeJson(ALLERGENS_KEY, next);
  return next;
}

function normalizeFavoriteItem(value) {
  if (typeof value === 'string') {
    return {
      id: value,
      category: DEFAULT_CATEGORY
    };
  }
  if (value && typeof value.id === 'string') {
    return {
      id: value.id,
      category: typeof value.category === 'string' ? value.category : DEFAULT_CATEGORY
    };
  }
  return null;
}
