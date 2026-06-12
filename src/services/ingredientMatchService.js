import { fetchIngredientBatchSearch } from './ingredientApiService.js';
import { getAllIngredients } from './ingredientService.js';
import { normalizeText } from '../utils/text.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const API_BATCH_SIZE = 200;
const matchCache = new Map();

export async function matchIngredients(parsedIngredients = [], category = 'food') {
  const parsed = normalizeParsedIngredients(parsedIngredients);
  const uniqueTerms = getQueryableTerms(parsed);
  const uncachedTerms = uniqueTerms.filter((term) => !getCached(term));
  const remoteResults = new Map();

  try {
    for (const batch of chunk(uncachedTerms, API_BATCH_SIZE)) {
      const response = await fetchIngredientBatchSearch(batch);
      for (const result of response.results || []) {
        remoteResults.set(normalizeTerm(result.term), normalizeRemoteResult(result));
      }
    }
  } catch {
    // API failure is expected in local-only mode; fallback below keeps analysis usable.
  }

  for (const term of uncachedTerms) {
    const remote = remoteResults.get(normalizeTerm(term));
    setCached(term, remote || findLocalMatch(term, category));
  }

  return buildMatchSummary(parsed.map((item) => {
    const key = getParsedQueryKey(item);
    return {
      parsedIngredient: item,
      term: item.normalizedText,
      ...getCached(key)
    };
  }));
}

export function matchIngredientsLocal(parsedIngredients = [], category = 'food') {
  const parsed = normalizeParsedIngredients(parsedIngredients);
  return buildMatchSummary(parsed.map((item) => ({
    parsedIngredient: item,
    term: item.normalizedText,
    ...findLocalMatch(getParsedQueryKey(item), category)
  })));
}

export function normalizeTerm(text) {
  return String(text || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '')
    .replace(/^(?:食品添加剂|添加剂)\s*[:：]?\s*/, '');
}

export function clearMatchCache() {
  matchCache.clear();
}

function getCached(term) {
  const key = normalizeTerm(term);
  const cached = matchCache.get(key);
  if (!cached || cached.expiry < Date.now()) {
    matchCache.delete(key);
    return null;
  }
  return cached.result;
}

function setCached(term, result) {
  matchCache.set(normalizeTerm(term), {
    result,
    expiry: Date.now() + CACHE_TTL_MS
  });
}

function findLocalMatch(term, category) {
  const normalized = normalizeTerm(term);
  const eNumber = extractENumber(term);
  const candidates = getAllIngredients(category);
  let best = buildNoMatch(term, eNumber);

  for (const ingredient of candidates) {
    const result = scoreIngredient(ingredient, normalized, eNumber);
    if (result.confidence > best.confidence) {
      best = {
        term,
        eNumber,
        match: toIngredientSummary(ingredient),
        confidence: result.confidence,
        matchType: result.matchType,
        alternates: []
      };
    }
  }

  if (best.match) {
    best.alternates = candidates
      .map((ingredient) => ({ ingredient, result: scoreIngredient(ingredient, normalized, eNumber) }))
      .filter((item) => item.ingredient.id !== best.match.id && item.result.confidence >= 0.55)
      .sort((a, b) => b.result.confidence - a.result.confidence)
      .slice(0, 2)
      .map((item) => toIngredientSummary(item.ingredient));
  }

  return best;
}

function scoreIngredient(ingredient, normalized, eNumber) {
  const fields = getMatchFields(ingredient);
  if (eNumber && normalizeTerm(ingredient.eNumber) === normalizeTerm(eNumber)) {
    return { confidence: 0.99, matchType: 'eNumber' };
  }
  if (fields.names.some((name) => normalizeTerm(name) === normalized)) {
    return { confidence: 1, matchType: 'exact' };
  }
  if (fields.aliases.some((alias) => normalizeTerm(alias) === normalized)) {
    return { confidence: 0.92, matchType: 'alias' };
  }
  if (normalized.length >= 2 && fields.all.some((field) => normalizeTerm(field).startsWith(normalized) || normalized.startsWith(normalizeTerm(field)))) {
    return { confidence: 0.75, matchType: 'fuzzy' };
  }
  if (normalized.length >= 2 && fields.all.some((field) => normalizeTerm(field).includes(normalized) || normalized.includes(normalizeTerm(field)))) {
    return { confidence: 0.55, matchType: 'fuzzy' };
  }
  return { confidence: 0, matchType: 'none' };
}

function buildMatchSummary(results) {
  const total = results.length;
  const matched = results.filter((result) => result.match && result.confidence > 0);
  const unmatchedTerms = results
    .filter((result) => !result.match || result.confidence === 0)
    .map((result) => result.parsedIngredient.normalizedText);
  const lowConfidenceTerms = results
    .filter((result) => result.confidence >= 0.55 && result.confidence < 0.9)
    .map((result) => result.parsedIngredient.normalizedText);

  return {
    results,
    matchRate: total ? matched.length / total : 0,
    unmatchedTerms,
    lowConfidenceTerms
  };
}

function normalizeRemoteResult(result) {
  return {
    term: result.term,
    eNumber: result.eNumber || null,
    match: result.match || null,
    confidence: Number(result.confidence) || 0,
    matchType: result.matchType || 'none',
    alternates: Array.isArray(result.alternates) ? result.alternates.slice(0, 2) : []
  };
}

function buildNoMatch(term, eNumber = null) {
  return {
    term,
    eNumber,
    match: null,
    confidence: 0,
    matchType: 'none',
    alternates: []
  };
}

function getQueryableTerms(parsed) {
  const seen = new Set();
  const terms = [];
  for (const item of parsed) {
    if (item.isDuplicate) continue;
    const key = getParsedQueryKey(item);
    const normalized = normalizeTerm(key);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    terms.push(key);
  }
  return terms;
}

function getParsedQueryKey(item) {
  return item.eNumber || item.normalizedText;
}

function normalizeParsedIngredients(value) {
  return Array.isArray(value) ? value.filter((item) => item && item.normalizedText) : [];
}

function getMatchFields(ingredient) {
  const names = [ingredient.nameCn, ingredient.nameEn, ingredient.gbCode, ingredient.eNumber].filter(Boolean);
  const aliases = Array.isArray(ingredient.aliases) ? ingredient.aliases.filter(Boolean) : [];
  return {
    names,
    aliases,
    all: [...names, ...aliases]
  };
}

function toIngredientSummary(ingredient) {
  return {
    id: ingredient.id,
    nameCn: ingredient.nameCn,
    nameEn: ingredient.nameEn,
    aliases: ingredient.aliases || [],
    category: ingredient.category,
    riskLevel: ingredient.riskLevel,
    riskSummary: ingredient.riskSummary || '',
    gbCode: ingredient.gbCode || '',
    eNumber: ingredient.eNumber || null,
    confidenceLevel: ingredient.confidenceLevel || 'unverified',
    isVerified: ingredient.isVerified === true,
    sourceName: ingredient.sourceName || '',
    reviewStatus: ingredient.reviewStatus || 'draft',
    allergenTypes: ingredient.allergenTypes || [],
    cautionGroups: ingredient.cautionGroups || []
  };
}

function extractENumber(value) {
  const match = String(value || '').match(/\bE\s*\d{3,4}[a-z]?\b/i);
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : null;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
