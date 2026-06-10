import { getIngredientById } from '../services/ingredientService.js';
import { readJson, writeJson } from '../services/storageService.js';

const FAVORITES_KEY = 'compcheck:favorites';
const HISTORY_KEY = 'compcheck:history';
const MAX_HISTORY = 8;

export function getFavoriteIds() {
  return readJson(FAVORITES_KEY, []);
}

export function getFavoriteIngredients() {
  return getFavoriteIds()
    .map((id) => getIngredientById(id))
    .filter(Boolean);
}

export function toggleFavorite(id) {
  const current = getFavoriteIds();
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [id, ...current];
  writeJson(FAVORITES_KEY, next);
  return next;
}

export function isFavorite(id) {
  return getFavoriteIds().includes(id);
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
