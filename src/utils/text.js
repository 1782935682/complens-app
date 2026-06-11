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
const labelPrefixPattern = /(?:配料表?|成分表?|原料|ingredients?)\s*[:：]/gi;
const genericBracketPrefixes = [
  '食品添加剂',
  '添加剂',
  '复配添加剂',
  '酸度调节剂',
  '抗氧化剂',
  '防腐剂',
  '甜味剂',
  '增稠剂',
  '乳化剂',
  '着色剂',
  '色素',
  '护色剂',
  '膨松剂',
  '稳定剂',
  '营养强化剂'
];

export function splitIngredientInput(value) {
  return normalizeIngredientInput(value)
    .replace(/单\s*[,，、]\s*双/g, `单${protectedDelimiter}双`)
    .split(/[,，、;；\n\r]+/)
    .map((item) => normalizeIngredientItem(item).replaceAll(protectedDelimiter, '，').trim())
    .filter(Boolean);
}

function normalizeIngredientInput(value) {
  return expandBracketGroups(String(value || '').replace(labelPrefixPattern, ''));
}

function expandBracketGroups(value) {
  return String(value || '').replace(/([^,，、;；\n\r()（）]*)[\(（]([^()（）]+)[\)）]/g, (match, prefix, content) => {
    const cleanPrefix = normalizeIngredientItem(prefix);
    const cleanContent = String(content || '').trim();
    if (!cleanContent) return cleanPrefix;

    if (isGenericBracketPrefix(cleanPrefix)) return `，${cleanContent}`;
    if (shouldExpandNonGenericBracketContent(cleanContent)) return `${cleanPrefix}，${cleanContent}`;
    return cleanPrefix;
  });
}

function normalizeIngredientItem(value) {
  return stripQuantitySuffix(stripBracketNotes(value))
    .replace(labelPrefixPattern, '')
    .replace(/^\s*[\d一二三四五六七八九十]+[.、)]\s*/, '')
    .replace(/^\s*(?:食品添加剂|添加剂)\s*[:：-]?\s*$/, '')
    .trim();
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

function shouldExpandNonGenericBracketContent(value) {
  return /[，,、;；]/.test(value) && /[\u3400-\u9FFF]/.test(value);
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
