import { standardAllergens } from '../data/allergens.js';
import { normalizeText } from '../utils/text.js';

const allergenById = new Map(standardAllergens.map((allergen) => [allergen.id, allergen]));

export function getMatchingUserAllergens(ingredient, userAllergens = []) {
  const userSet = new Set(userAllergens);
  return (ingredient?.allergenTypes || [])
    .filter((allergenId) => userSet.has(allergenId))
    .map((allergenId) => allergenById.get(allergenId))
    .filter(Boolean);
}

export function getAllergensByIds(allergenIds = []) {
  return (Array.isArray(allergenIds) ? allergenIds : [])
    .map((allergenId) => allergenById.get(allergenId))
    .filter(Boolean);
}

export function getMatchingTextAllergens(value, userAllergens = []) {
  if (value == null) return [];

  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return [];

  const userSet = new Set(userAllergens);
  if (!userSet.size) return [];

  return standardAllergens.filter((allergen) => {
    if (!userSet.has(allergen.id)) return false;
    return getAllergenSearchTerms(allergen).some((term) => {
      const normalizedTerm = normalizeText(term);
      return normalizedTerm && normalizedValue.includes(normalizedTerm);
    });
  });
}

export function formatAllergenNames(allergens = []) {
  return allergens
    .map((allergen) => {
      if (typeof allergen === 'string') {
        if (!allergen.trim()) return '';
        return allergenById.get(allergen)?.nameCn || '未知过敏原';
      }
      return allergen?.nameCn || '未知过敏原';
    })
    .filter(Boolean)
    .join('、');
}

function getAllergenSearchTerms(allergen) {
  return [
    allergen.nameCn,
    allergen.nameEn,
    ...(allergen.aliases || [])
  ].filter(Boolean);
}
