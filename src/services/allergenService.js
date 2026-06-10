import { standardAllergens } from '../data/allergens.js';

const allergenById = new Map(standardAllergens.map((allergen) => [allergen.id, allergen]));

export function getMatchingUserAllergens(ingredient, userAllergens = []) {
  const userSet = new Set(userAllergens);
  return (ingredient?.allergenTypes || [])
    .filter((allergenId) => userSet.has(allergenId))
    .map((allergenId) => allergenById.get(allergenId))
    .filter(Boolean);
}

export function formatAllergenNames(allergens = []) {
  return allergens.map((allergen) => allergen.nameCn).join('、');
}
