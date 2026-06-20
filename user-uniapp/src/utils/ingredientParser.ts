import { isAdditiveWrapperLabel } from '@/constants/additiveFunctions';
import type { ParsedIngredient } from '@/types';

const splitDelimiterPattern = /[,，、;；\n\r]+/;
const protectedDelimiter = '\uE000';
const prefixPattern = /^\s*(?:配\s*料\s*(?:表|衰)?|护\s*料\s*(?:表)?|食品\s*配\s*料|原\s*料|食品添加剂|ingredients?)\s*[:：-]\s*/i;

export function parseIngredientList(text: string): ParsedIngredient[] {
  const prepared = normalizeInput(text)
    .replace(/单\s*[,，、]\s*双/g, `单${protectedDelimiter}双`)
    .replace(/5\s*'\s*[-－]?\s*呈味/g, "5'-呈味");
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
    .filter((item) => !isNoiseIngredientItem(item.normalizedText))
    .filter((item) => item.normalizedText);
}

function normalizeInput(text: string): string {
  return repairOcrIngredientBreaks(extractIngredientSection(String(text || '')))
    .normalize('NFKC')
    .replace(/\r?\n/g, '，')
    .replace(prefixPattern, '')
    .replace(/[,，、]{2,}/g, '，')
    .trim();
}

function repairOcrIngredientBreaks(text: string): string {
  return String(text || '')
    .replace(/姜\s*\n\s*黄粉/g, '姜黄粉')
    .replace(/脱脂乳\s*\n\s*粉/g, '脱脂乳粉')
    .replace(/谷氨酸\s*\n\s*钠/g, '谷氨酸钠')
    .replace(/木糖\s*\n\s*醇/g, '木糖醇')
    .replace(/果\s*\n\s*胶/g, '果胶')
    .replace(/明胶\s*\n\s*[(（]\s*来源于牛骨\s*[)）]/g, '明胶(来源于牛骨)')
    .replace(/5\s*[-－']?\s*肌苷酸二\s*\n\s*钠/g, "5'-肌苷酸二钠")
    .replace(/5\s*[一-]\s*呈味核苷酸二\s*\n\s*钠/g, "5'-呈味核苷酸二钠")
    .replace(/食用\s*\n\s*焦糖色/g, '焦糖色');
}

function extractIngredientSection(text: string): string {
  const normalized = String(text || '').normalize('NFKC');
  const heading = normalized.search(/(?:配\s*料\s*(?:表|衰)?|食品\s*配\s*料|原\s*料|成\s*[分份]|ingredients?)\s*[:：]/i);
  if (heading < 0) return normalized;
  const section = normalized.slice(heading);
  const stop = section.search(/(?:营养成分表|营养成分|營養成分表|營養成分|致敏原提示|过敏原提示|净含量|产品名称|商品名称|生产日期|保质期|生产商|制造商|委托方|经销商|地址|电话|食品生产许可证|执行标准|条码|条形码|贮存|储存|\bSC\s*\d{6,}\b)/i);
  return stop > 0 ? section.slice(0, stop) : section;
}

function parseSegment(segment: string): Array<{ rawText: string; normalizedText: string; isSubIngredient: boolean; parentLabel?: string }> {
  const rawText = segment.trim();
  if (!rawText) return [];
  const open = rawText.search(/[(（]/);
  const close = rawText.endsWith(')') || rawText.endsWith('）') ? rawText.length - 1 : -1;
  if (open > 0 && close > open) {
    const parent = cleanItem(rawText.slice(0, open));
    const content = rawText.slice(open + 1, close);
    if (isAdditiveWrapperLabel(parent)) {
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
    .replace(/\s*[\(（]([^()（）]*)[\)）]\s*/g, ' $1 ')
    .replace(/\s*(?:含量|添加量)?\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:%|g|kg|mg|ml|克|千克|毫克|毫升)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoiseIngredientItem(value: string): boolean {
  const text = String(value || '').trim();
  if (!text) return true;
  if (/^(?:食用|钠|粉|黄粉)$/.test(text)) return true;
  if (/^(?:\d+|[A-Z0-9\-./]+)$/i.test(text)) return true;
  if (/(?:净含量|生产日期|保质期|生产商|制造商|委托方|经销商|地址|电话|邮编|食品生产许可证|许可证编号|执行标准|条码|条形码|二维码|贮存|储存|产地|规格|食用方法|温馨提示|开封后|见包装|本品|本产品)/.test(text)) return true;
  if (/(?:有限公司|公司|工厂|工业园|开发区|省|市|区|县|路|街|号)\s*$/.test(text) && text.length > 6) return true;
  if (/\d{4}\s*年|\d{1,2}\s*月|\d{1,2}\s*日|保质期\s*\d+/.test(text)) return true;
  if (text.length > 32 && !/[、，,]/.test(text)) return true;
  return false;
}
