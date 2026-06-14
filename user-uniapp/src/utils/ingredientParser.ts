import type { ParsedIngredient } from '@/types';

const splitDelimiterPattern = /[,，、;；\n\r]+/;
const protectedDelimiter = '\uE000';
const prefixPattern = /^\s*(?:配\s*料\s*表?|原\s*料|食品添加剂|ingredients?)\s*[:：-]\s*/i;
const genericBracketPrefixes = ['食品添加剂', '添加剂', '防腐剂', '甜味剂', '色素', '食用香精', '酸度调节剂'];

export function parseIngredientList(text: string): ParsedIngredient[] {
  const prepared = normalizeInput(text).replace(/单\s*[,，、]\s*双/g, `单${protectedDelimiter}双`);
  const parsed = splitTopLevel(prepared).flatMap(parseSegment);
  const seen = new Set<string>();
  return parsed
    .map((item, index) => {
      const normalizedText = item.normalizedText.replaceAll(protectedDelimiter, '，').trim();
      const key = normalizedText.toLowerCase();
      const duplicate = seen.has(key);
      if (key) seen.add(key);
      return {
        id: `ingredient-${index}-${key || 'unknown'}`,
        rawText: item.rawText.replaceAll(protectedDelimiter, '，').trim(),
        normalizedText,
        isSubIngredient: item.isSubIngredient,
        parentLabel: item.parentLabel,
        isUnknown: !normalizedText || duplicate || /未识别|无法识别|unknown/i.test(normalizedText)
      };
    })
    .filter((item) => item.normalizedText);
}

function normalizeInput(text: string): string {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\r?\n/g, '，')
    .replace(prefixPattern, '')
    .replace(/[,，、]{2,}/g, '，')
    .trim();
}

function parseSegment(segment: string): Array<{ rawText: string; normalizedText: string; isSubIngredient: boolean; parentLabel?: string }> {
  const rawText = segment.trim();
  if (!rawText) return [];
  const open = rawText.search(/[(（]/);
  const close = rawText.endsWith(')') || rawText.endsWith('）') ? rawText.length - 1 : -1;
  if (open > 0 && close > open) {
    const parent = cleanItem(rawText.slice(0, open));
    const content = rawText.slice(open + 1, close);
    if (genericBracketPrefixes.some((prefix) => parent.includes(prefix))) {
      return splitTopLevel(content).map((child) => ({
        rawText: child,
        normalizedText: cleanItem(child),
        isSubIngredient: true,
        parentLabel: parent
      }));
    }
  }
  return [{ rawText, normalizedText: cleanItem(rawText), isSubIngredient: false }];
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of value) {
    if (char === '(' || char === '（') depth += 1;
    if (char === ')' || char === '）') depth = Math.max(0, depth - 1);
    if (depth === 0 && splitDelimiterPattern.test(char)) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function cleanItem(value: string): string {
  return String(value || '')
    .replace(prefixPattern, '')
    .replace(/\s*[\(（][^()（）]*[\)）]\s*/g, '')
    .replace(/\s*(?:含量|添加量)?\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:%|g|kg|mg|ml|克|千克|毫克|毫升)\s*$/i, '')
    .trim();
}
