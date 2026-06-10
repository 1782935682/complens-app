export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export const SAMPLES = {
  'food-1': '水，果糖糖浆，二氧化碳，焦糖色，磷酸，咖啡因，柠檬酸，阿斯巴甜',
  'food-2': '小麦粉，白砂糖，精炼植物油，起酥油，全脂奶粉，卵磷脂，碳酸氢钠，焦亚硫酸钠',
  'food-3': '水，浓缩苹果汁，柠檬酸，抗坏血酸，山梨酸钾，蔗糖，黄原胶，三氯蔗糖',
  'food-4': '辣椒，大蒜，食盐，水，柠檬酸钠，黄原胶，苯甲酸钠，焦亚硫酸钠',
  'food-5': '水，果葡糖浆，白砂糖，魔芋粉，卡拉胶，柠檬酸，柠檬酸钠，山梨酸钾，阿斯巴甜',
  'cosmetic-1': '水，甘油，烟酰胺，水杨酸，透明质酸钠，香精，苯氧乙醇',
  'cosmetic-2': '水，椰油酰甘氨酸钠，甘油，透明质酸钠，柠檬酸，苯氧乙醇'
};

export function splitIngredientInput(value) {
  return String(value || '')
    .split(/[,，、;；\n\r]+/)
    .map((item) => stripBracketNotes(item).trim())
    .filter(Boolean);
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

export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
