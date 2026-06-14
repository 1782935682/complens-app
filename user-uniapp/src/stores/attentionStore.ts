import { defaultAttentionGoalKeys } from '@/constants/attention';
import { readJson, writeJson } from '@/platform/storage';
import type { AttentionSettings } from '@/types';

const KEY = 'complens:user-attention-settings';

export function getAttentionSettings(): AttentionSettings {
  return readJson<AttentionSettings>(KEY, {
    goals: defaultAttentionGoalKeys,
    detailTerms: ['糖', '钠', '防腐剂', '色素', '食用香精'],
    customTerms: [],
    updatedAt: new Date().toISOString()
  });
}

export function saveAttentionSettings(settings: AttentionSettings): AttentionSettings {
  const next = {
    goals: uniqueStrings(settings.goals),
    detailTerms: uniqueStrings(settings.detailTerms),
    customTerms: uniqueStrings(settings.customTerms),
    updatedAt: new Date().toISOString()
  };
  writeJson(KEY, next);
  return next;
}

export function clearAttentionSettings(): AttentionSettings {
  const next: AttentionSettings = { goals: [], detailTerms: [], customTerms: [], updatedAt: new Date().toISOString() };
  writeJson(KEY, next);
  return next;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}
