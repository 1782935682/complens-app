import { allergenOptions, defaultAttentionSettings } from '@/constants/attention';
import { readJson, writeJson } from '@/platform/storage';
import type { AttentionSettings } from '@/types';

const KEY = 'complens:user-attention-settings';

type LegacyAttentionSettings = Partial<AttentionSettings> & {
  goals?: string[];
  detailTerms?: string[];
  customTerms?: string[];
};

export function getAttentionSettings(): AttentionSettings {
  return normalizeAttentionSettings(readJson<LegacyAttentionSettings>(KEY, defaultAttentionSettings));
}

export function saveAttentionSettings(settings: AttentionSettings): AttentionSettings {
  const next = normalizeAttentionSettings(settings);
  writeJson(KEY, next);
  return next;
}

export function clearAttentionSettings(): AttentionSettings {
  const next = {
    ...defaultAttentionSettings,
    updatedAt: new Date().toISOString()
  };
  writeJson(KEY, next);
  return next;
}

function normalizeAttentionSettings(value: LegacyAttentionSettings): AttentionSettings {
  const legacyGoals = Array.isArray(value.goals) ? value.goals : [];
  const legacyTerms = [
    ...(Array.isArray(value.detailTerms) ? value.detailTerms : []),
    ...(Array.isArray(value.customTerms) ? value.customTerms : [])
  ];
  const primaryGoal = normalizePrimaryGoal(value.primaryGoal, legacyGoals);
  const allergens = uniqueStrings([
    ...(Array.isArray(value.allergens) ? value.allergens : []),
    ...legacyTerms.flatMap(matchLegacyAllergenKeys)
  ]).filter((key) => allergenOptions.some((item) => item.key === key));
  return {
    primaryGoal,
    isChildrenMode: Boolean(value.isChildrenMode || legacyGoals.includes('for_children')),
    allergens,
    updatedAt: String(value.updatedAt || new Date().toISOString())
  };
}

function normalizePrimaryGoal(value: unknown, legacyGoals: string[]): AttentionSettings['primaryGoal'] {
  if (value === 'sugar' || value === 'fatLoss' || value === 'lowSodium' || value === 'daily') return value;
  if (isLegacyDefaultGoalSet(legacyGoals) || legacyGoals.includes('daily_balance') || legacyGoals.includes('fewer_additives')) return 'daily';
  if (legacyGoals.includes('sugar_control')) return 'sugar';
  if (legacyGoals.includes('fat_control')) return 'fatLoss';
  if (legacyGoals.includes('low_sodium')) return 'lowSodium';
  return 'daily';
}

function isLegacyDefaultGoalSet(legacyGoals: string[]): boolean {
  const goalSet = new Set(legacyGoals);
  return goalSet.has('daily_balance') && goalSet.has('sugar_control') && goalSet.has('fewer_additives');
}

function matchLegacyAllergenKeys(term: string): string[] {
  const text = String(term || '').trim();
  return allergenOptions
    .filter((option) => option.label === text || option.key === text || option.keywords.some((keyword) => text.includes(keyword) || keyword.includes(text)))
    .map((option) => option.key);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}
