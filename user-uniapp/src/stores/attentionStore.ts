import { allergenOptions, defaultAttentionSettings } from '@/constants/attention';
import { readJson, writeJson } from '@/platform/storage';
import type { AttentionGoal, AttentionSettings } from '@/types';

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
    targetGoals: [],
    updatedAt: new Date().toISOString()
  };
  writeJson(KEY, next);
  return next;
}

function normalizeAttentionSettings(value: LegacyAttentionSettings): AttentionSettings {
  const legacyGoals = Array.isArray(value.goals) ? value.goals : [];
  const targetGoals = normalizeTargetGoals(value.targetGoals, value.primaryGoal, legacyGoals, value.isChildrenMode);
  const legacyTerms = [
    ...(Array.isArray(value.detailTerms) ? value.detailTerms : []),
    ...(Array.isArray(value.customTerms) ? value.customTerms : [])
  ];
  const primaryGoal = normalizePrimaryGoal(value.primaryGoal, legacyGoals, targetGoals);
  const isChildrenMode = targetGoals.includes('children') || Boolean(value.isChildrenMode || legacyGoals.includes('for_children'));
  const normalizedTargets = uniqueAttentionGoals([
    ...targetGoals,
    isChildrenMode ? 'children' : undefined
  ]);
  const allergens = uniqueStrings([
    ...(Array.isArray(value.allergens) ? value.allergens : []),
    ...legacyTerms.flatMap(matchLegacyAllergenKeys)
  ]).filter((key) => allergenOptions.some((item) => item.key === key));
  return {
    primaryGoal,
    targetGoals: normalizedTargets,
    isChildrenMode,
    allergens,
    updatedAt: String(value.updatedAt || new Date().toISOString())
  };
}

function normalizeTargetGoals(
  value: unknown,
  primaryGoal: unknown,
  legacyGoals: string[],
  legacyChildrenMode: unknown
): AttentionGoal[] {
  const rawGoals = Array.isArray(value) ? value : [];
  const fromLegacy = isLegacyDefaultGoalSet(legacyGoals)
    ? []
    : legacyGoals.map(mapLegacyGoalToTarget).filter((item): item is AttentionGoal => Boolean(item));
  const primary = normalizePrimaryGoalValue(primaryGoal, legacyGoals);
  return uniqueAttentionGoals([
    ...rawGoals.map(mapLegacyGoalToTarget),
    ...fromLegacy,
    primary !== 'daily' ? primary : undefined,
    legacyChildrenMode || legacyGoals.includes('for_children') ? 'children' : undefined
  ]);
}

function normalizePrimaryGoal(value: unknown, legacyGoals: string[], targetGoals: AttentionGoal[]): AttentionSettings['primaryGoal'] {
  const fromTarget = targetGoals.find((item): item is Exclude<AttentionGoal, 'children'> => item !== 'children');
  if (fromTarget) return fromTarget;
  return normalizePrimaryGoalValue(value, legacyGoals);
}

function normalizePrimaryGoalValue(value: unknown, legacyGoals: string[]): AttentionSettings['primaryGoal'] {
  if (value === 'sugar' || value === 'fatLoss' || value === 'lowSodium' || value === 'daily') return value;
  if (isLegacyDefaultGoalSet(legacyGoals) || legacyGoals.includes('daily_balance') || legacyGoals.includes('fewer_additives')) return 'daily';
  if (legacyGoals.includes('sugar_control')) return 'sugar';
  if (legacyGoals.includes('fat_control')) return 'fatLoss';
  if (legacyGoals.includes('low_sodium')) return 'lowSodium';
  return 'daily';
}

function mapLegacyGoalToTarget(value: unknown): AttentionGoal | undefined {
  const goal = String(value || '').trim();
  if (goal === 'sugar' || goal === 'sugar_control') return 'sugar';
  if (goal === 'fatLoss' || goal === 'fat_control') return 'fatLoss';
  if (goal === 'lowSodium' || goal === 'low_sodium') return 'lowSodium';
  if (goal === 'children' || goal === 'for_children') return 'children';
  return undefined;
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

function uniqueAttentionGoals(values: Array<AttentionGoal | undefined>): AttentionGoal[] {
  return [...new Set(values.filter((value): value is AttentionGoal => Boolean(value)))];
}
