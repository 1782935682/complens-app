export function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[，。、；：！？,.;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Food samples intentionally mix additive records with ordinary label ingredients.
// Ordinary ingredients such as wheat flour or milk powder are handled by text
// allergen matching rather than the food-additive database.
export const SAMPLES = {
  'food-1': '水，果糖糖浆，二氧化碳，焦糖色，磷酸，咖啡因，柠檬酸，阿斯巴甜',
  'food-2': '小麦粉，白砂糖，精炼植物油，起酥油，全脂奶粉，卵磷脂，碳酸氢钠，焦亚硫酸钠',
  'food-3': '水，浓缩苹果汁，柠檬酸，抗坏血酸，山梨酸钾，蔗糖，黄原胶，三氯蔗糖',
  'food-4': '辣椒，大蒜，食盐，水，柠檬酸钠，黄原胶，苯甲酸钠，焦亚硫酸钠',
  'food-5': '水，果葡糖浆，白砂糖，魔芋粉，卡拉胶，柠檬酸，柠檬酸钠，山梨酸钾，阿斯巴甜',
  'cosmetic-1': '水，甘油，烟酰胺，水杨酸，透明质酸钠，香精，苯氧乙醇',
  'cosmetic-2': '水，椰油酰甘氨酸钠，甘油，透明质酸钠，柠檬酸，苯氧乙醇'
};

export const SAMPLE_OPTIONS = [
  { id: 'food-1', category: 'food', label: '示例1：无糖可乐（含有柠檬酸、阿斯巴甜）' },
  { id: 'food-2', category: 'food', label: '示例2：夹心饼干（含有大豆、牛奶、麸质过敏原）' },
  { id: 'food-3', category: 'food', label: '示例3：果汁饮料（含有黄原胶、山梨酸钾）' },
  { id: 'food-4', category: 'food', label: '示例4：蒜蓉辣椒酱（含有焦亚硫酸钠过敏原）' },
  { id: 'food-5', category: 'food', label: '示例5：果味果冻（含有柠檬酸钠、三氯蔗糖）' },
  { id: 'cosmetic-1', category: 'cosmetics', label: '示例1：保湿抗衰面霜（含有烟酰胺、水杨酸）' },
  { id: 'cosmetic-2', category: 'cosmetics', label: '示例2：温和无刺激洁面乳（含有椰油酰甘氨酸钠）' }
];

const protectedDelimiter = '\uE000';
const labelPrefixPattern = /^\s*(?:配\s*料\s*表?|原\s*料|原\s*材\s*料|食品添加剂|配方|成\s*分\s*表?|ingredients?)\s*[:：-]\s*/gi;
const splitDelimiterPattern = /[,，、;；\n\r]+/;
const eNumberPattern = /\bE\s*\d{3,4}[a-z]?\b/i;
const percentOnlyPattern = /^\s*\d+(?:\.\d+)?\s*%\s*$/;
const genericBracketPrefixes = [
  '食品添加剂',
  '添加剂',
  '复配添加剂',
  '保湿剂',
  '酸度调节剂',
  '抗结剂',
  '抗氧化剂',
  '防腐剂',
  '漂白剂',
  '甜味剂',
  '增稠剂',
  '增味剂',
  '乳化剂',
  '着色剂',
  '色素',
  '护色剂',
  '膨松剂',
  '稳定剂',
  '营养强化剂'
];

export function splitIngredientInput(value) {
  return parseIngredientList(value).map((item) => item.normalizedText).filter(Boolean);
}

export function parseIngredientList(rawInput) {
  const prepared = normalizeIngredientInput(rawInput).replace(/单\s*[,，、]\s*双/g, `单${protectedDelimiter}双`);
  const parsed = [];

  for (const segment of splitTopLevel(prepared)) {
    parsed.push(...parseIngredientSegment(segment));
  }

  const seen = new Set();
  return parsed.map((item, index) => {
    const normalizedText = item.normalizedText.replaceAll(protectedDelimiter, '，').trim();
    const duplicateKey = normalizeText(normalizedText).replace(/\s+/g, '');
    const isDuplicate = duplicateKey ? seen.has(duplicateKey) : false;
    if (duplicateKey) seen.add(duplicateKey);
    return {
      index,
      rawText: item.rawText.replaceAll(protectedDelimiter, '，').trim(),
      normalizedText,
      eNumber: item.eNumber || extractENumber(normalizedText),
      isSubIngredient: Boolean(item.isSubIngredient),
      parentLabel: item.parentLabel || undefined,
      isUnknown: isUnknownIngredientText(normalizedText),
      isDuplicate
    };
  }).filter((item) => item.normalizedText);
}

export function applyOcrCorrections(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\r?\n/g, '，')
    .replace(/([^\x00-\x7F])[ \t]+([^\x00-\x7F])/g, '$1$2')
    .replace(/[,，、]{2,}/g, '，')
    .replace(/\s+([,，、;；:：])/g, '$1')
    .replace(/([,，、;；:：])\s+/g, '$1');
}

export function extractENumber(text) {
  const match = String(text || '').match(eNumberPattern);
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : null;
}

function normalizeIngredientInput(value) {
  return applyOcrCorrections(value).replace(labelPrefixPattern, '');
}

function parseIngredientSegment(segment) {
  const rawSegment = String(segment || '').trim();
  if (!rawSegment) return [];

  const bracket = rawSegment.match(/^([^()（）]*?)[(（]([^()（）]+)[)）]\s*$/);
  if (bracket) {
    const rawPrefix = String(bracket[1] || '').trim();
    const cleanPrefix = normalizeIngredientItem(rawPrefix);
    const cleanContent = String(bracket[2] || '').trim();
    if (!cleanContent) return cleanPrefix ? [buildParsedItem(rawSegment, cleanPrefix)] : [];
    if (!cleanPrefix && !rawPrefix) return [];

    if (isGenericBracketPrefix(cleanPrefix || rawPrefix) && !percentOnlyPattern.test(cleanContent)) {
      return splitTopLevel(cleanContent)
        .map((child) => normalizeIngredientItem(child))
        .filter(Boolean)
        .map((child) => buildParsedItem(child, child, {
          isSubIngredient: true,
          parentLabel: cleanPrefix || rawPrefix
        }));
    }

    if (percentOnlyPattern.test(cleanContent)) {
      return cleanPrefix ? [buildParsedItem(rawSegment, cleanPrefix)] : [];
    }

    const bracketENumber = extractENumber(cleanContent);
    return cleanPrefix ? [buildParsedItem(rawSegment, cleanPrefix, { eNumber: bracketENumber })] : [];
  }

  const normalized = normalizeIngredientItem(rawSegment);
  return normalized ? [buildParsedItem(rawSegment, normalized)] : [];
}

function buildParsedItem(rawText, normalizedText, overrides = {}) {
  return {
    rawText,
    normalizedText,
    eNumber: overrides.eNumber || extractENumber(rawText) || extractENumber(normalizedText),
    isSubIngredient: Boolean(overrides.isSubIngredient),
    parentLabel: overrides.parentLabel
  };
}

export function normalizeIngredientItem(value) {
  return stripQuantitySuffix(stripBracketNotes(value))
    .replace(labelPrefixPattern, '')
    .replace(/^\s*[\d一二三四五六七八九十]+[.、)]\s*/, '')
    .replace(/^\s*(?:食品添加剂|添加剂)\s*[:：-]\s*/, '')
    .replace(/^\s*(?:食品添加剂|添加剂)\s*[:：-]?\s*$/, '')
    .trim();
}

function splitTopLevel(value) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (const char of String(value || '')) {
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

function stripBracketNotes(value) {
  let result = String(value || '');
  let previous;
  do {
    previous = result;
    result = result.replace(/\s*[\(（][^()（）]*[\)）]\s*/g, '');
  } while (result !== previous);
  return result;
}

function stripQuantitySuffix(value) {
  return String(value || '')
    .replace(/\s*(?:含量|添加量)?\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:%|g|kg|mg|ug|µg|ml|l|克|千克|毫克|微克|毫升|升)\s*$/i, '')
    .trim();
}

function isGenericBracketPrefix(value) {
  const compact = normalizeText(value).replace(/\s+/g, '');
  if (!compact) return false;
  return genericBracketPrefixes.some((prefix) => compact === normalizeText(prefix).replace(/\s+/g, '') || compact.endsWith(normalizeText(prefix).replace(/\s+/g, '')));
}

function isUnknownIngredientText(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return /unknown|未识别|无法识别/i.test(text);
}

export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
