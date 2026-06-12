import { formatAllergenNames, getMatchingUserAllergens } from './allergenService.js';
import { getAllIngredients, getIngredientById } from './ingredientService.js';
import { readJson, writeJson } from './storageService.js';

export const ALLERGENS_KEY = 'compcheck:allergens';
export const WATCH_INGREDIENTS_KEY = 'compcheck:watch-ingredients';
export const AVOID_INGREDIENTS_KEY = 'compcheck:avoid-ingredients';

export const PERSONAL_HIT_LABELS = {
  allergen: '含过敏原',
  avoid: '你的忌口项',
  watch: '你关注的'
};

const PRODUCT_CATEGORIES = ['food', 'cosmetics'];
const HIT_PRIORITY = ['allergen', 'avoid', 'watch'];

export function getPersonalProfile(category = '') {
  return {
    allergenIds: normalizeStringIds(readJson(ALLERGENS_KEY, [])),
    watchIds: getWatchIngredientIds(category),
    avoidIds: getAvoidIngredientIds(category)
  };
}

export function getWatchIngredientIds(category = '') {
  return normalizePersonalIngredientIds(readJson(WATCH_INGREDIENTS_KEY, []), category);
}

export function setWatchIngredientIds(ids, category = '') {
  const next = normalizePersonalIngredientIds(ids, category);
  writeJson(WATCH_INGREDIENTS_KEY, next);
  return next;
}

export function addWatchIngredient(id, category = '') {
  return addPersonalIngredient(WATCH_INGREDIENTS_KEY, id, category);
}

export function removeWatchIngredient(id) {
  return removePersonalIngredient(WATCH_INGREDIENTS_KEY, id);
}

export function clearWatchIngredients() {
  writeJson(WATCH_INGREDIENTS_KEY, []);
  return [];
}

export function getAvoidIngredientIds(category = '') {
  return normalizePersonalIngredientIds(readJson(AVOID_INGREDIENTS_KEY, []), category);
}

export function setAvoidIngredientIds(ids, category = '') {
  const next = normalizePersonalIngredientIds(ids, category);
  writeJson(AVOID_INGREDIENTS_KEY, next);
  return next;
}

export function addAvoidIngredient(id, category = '') {
  return addPersonalIngredient(AVOID_INGREDIENTS_KEY, id, category);
}

export function removeAvoidIngredient(id) {
  return removePersonalIngredient(AVOID_INGREDIENTS_KEY, id);
}

export function clearAvoidIngredients() {
  writeJson(AVOID_INGREDIENTS_KEY, []);
  return [];
}

export function getPersonalIngredients(ids = [], category = 'food') {
  return normalizePersonalIngredientIds(ids, category)
    .map((id) => getIngredientById(id, category))
    .filter(Boolean);
}

export function getPersonalIngredientOptions(category = 'food') {
  return getAllIngredients(category)
    .slice()
    .sort((a, b) => a.nameCn.localeCompare(b.nameCn, 'zh-Hans-CN'));
}

export function getPersonalIngredientHit(ingredient, category = 'food', profile = getPersonalProfile(category)) {
  if (!ingredient || typeof ingredient !== 'object') return null;
  const ingredientId = String(ingredient.id || '').trim();
  if (!ingredientId) return null;

  const allergenMatches = getMatchingUserAllergens(ingredient, profile.allergenIds);
  if (allergenMatches.length) {
    return createPersonalHit('allergen', ingredient, {
      detail: `过敏原：${formatAllergenNames(allergenMatches)}`,
      allergenIds: allergenMatches.map((allergen) => allergen.id),
      allergenNames: formatAllergenNames(allergenMatches)
    });
  }

  if (profile.avoidIds.includes(ingredientId)) {
    return createPersonalHit('avoid', ingredient, {
      detail: '已加入忌口项，建议核对包装说明；不构成医疗建议。'
    });
  }

  if (profile.watchIds.includes(ingredientId)) {
    return createPersonalHit('watch', ingredient, {
      detail: '已加入关注成分，不代表该成分有害。'
    });
  }

  return null;
}

export function getReportPersonalHits(report, profile = getPersonalProfile(report?.category || 'food')) {
  if (!report || typeof report !== 'object') return [];
  const category = report.category || 'food';
  const hits = [];
  const seen = new Set();

  for (const item of report.matchResults || []) {
    if (!item?.match || Number(item.confidence) <= 0) continue;
    const fullIngredient = getIngredientById(item.match.id, category);
    const ingredient = fullIngredient || item.match;
    const hit = getPersonalIngredientHit(ingredient, category, profile);
    if (!hit || seen.has(hit.id)) continue;
    seen.add(hit.id);
    hits.push({
      ...hit,
      name: ingredient.nameCn || item.parsedIngredient?.normalizedText || hit.id
    });
  }

  return hits.sort((a, b) => HIT_PRIORITY.indexOf(a.type) - HIT_PRIORITY.indexOf(b.type) || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

export function normalizePersonalIngredientIds(ids, category = '') {
  return normalizeStringIds(ids).filter((id) => isKnownIngredientId(id, category));
}

function addPersonalIngredient(key, id, category) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId || !isKnownIngredientId(normalizedId, category)) {
    return normalizePersonalIngredientIds(readJson(key, []), category);
  }

  const next = normalizePersonalIngredientIds([...readJson(key, []), normalizedId]);
  writeJson(key, next);
  return normalizePersonalIngredientIds(next, category);
}

function removePersonalIngredient(key, id) {
  const normalizedId = String(id || '').trim();
  const next = normalizePersonalIngredientIds(readJson(key, []).filter((item) => item !== normalizedId));
  writeJson(key, next);
  return next;
}

function createPersonalHit(type, ingredient, details = {}) {
  return {
    id: String(ingredient.id || ''),
    type,
    badgeLabel: PERSONAL_HIT_LABELS[type],
    detail: details.detail || '',
    allergenIds: details.allergenIds || [],
    allergenNames: details.allergenNames || ''
  };
}

function normalizeStringIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
}

function isKnownIngredientId(id, category = '') {
  if (category) return Boolean(getIngredientById(id, category));
  return PRODUCT_CATEGORIES.some((item) => getIngredientById(id, item));
}
