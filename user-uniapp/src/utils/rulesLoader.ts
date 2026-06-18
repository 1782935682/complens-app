import { readJson, writeJson } from '@/platform/storage';
import { foodAdditiveRules, setActiveFoodAdditiveRules, type AdditiveRule } from './additiveRules';

type RulesDictionary = {
  version: string;
  additives: AdditiveRule[];
  allergens?: unknown[];
  nutritionThresholds?: Record<string, unknown>;
  updatedAt?: string;
};

const RULES_CACHE_KEY = 'complens:rules-dictionary-cache';
const REMOTE_RULES_URL = '';
const DEFAULT_RULES_VERSION = '2026.06.17';

const defaultRulesDictionary: RulesDictionary = {
  version: DEFAULT_RULES_VERSION,
  additives: foodAdditiveRules,
  allergens: [],
  nutritionThresholds: {},
  updatedAt: '2026-06-17'
};

export function loadRulesDictionary(): RulesDictionary {
  const cached = readJson<RulesDictionary | undefined>(RULES_CACHE_KEY, undefined);
  const active = isValidRulesDictionary(cached) ? cached : defaultRulesDictionary;
  setActiveFoodAdditiveRules(active.additives);
  return active;
}

export async function primeRulesDictionary(): Promise<RulesDictionary> {
  const current = loadRulesDictionary();
  if (!REMOTE_RULES_URL) return current;
  try {
    const remote = await fetchRemoteRulesDictionary(REMOTE_RULES_URL);
    if (!isValidRulesDictionary(remote)) return current;
    if (compareVersions(remote.version, current.version) <= 0) return current;
    writeJson(RULES_CACHE_KEY, remote);
    setActiveFoodAdditiveRules(remote.additives);
    return remote;
  } catch {
    return current;
  }
}

function fetchRemoteRulesDictionary(url: string): Promise<RulesDictionary> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 6000,
      success: (response) => resolve(response.data as RulesDictionary),
      fail: reject
    });
  });
}

function isValidRulesDictionary(value: unknown): value is RulesDictionary {
  const dictionary = value as Partial<RulesDictionary> | undefined;
  return Boolean(
    dictionary
    && typeof dictionary.version === 'string'
    && dictionary.version.trim()
    && Array.isArray(dictionary.additives)
    && dictionary.additives.every(isValidAdditiveRule)
  );
}

function isValidAdditiveRule(value: unknown): value is AdditiveRule {
  const rule = value as Partial<AdditiveRule> | undefined;
  return Boolean(
    rule
    && typeof rule.name === 'string'
    && Array.isArray(rule.aliases)
    && typeof rule.category === 'string'
    && typeof rule.effect === 'string'
    && typeof rule.reminder === 'string'
    && Array.isArray(rule.keywords)
    && typeof rule.displayLevel === 'string'
  );
}

function compareVersions(left: string, right: string): number {
  const leftParts = toVersionParts(left);
  const rightParts = toVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff) return diff;
  }
  return 0;
}

function toVersionParts(value: string): number[] {
  return String(value || '')
    .split(/[^\d]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}
