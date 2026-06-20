export type MockProductRecord = {
  id: string;
  productName: string;
  brand: string;
  barcode: string;
  aliases: string[];
  frontKeywords: string[];
  ingredientText: string;
  nutritionText: string;
};

const mockProducts: MockProductRecord[] = [
  {
    id: 'mock-yogurt-strawberry',
    productName: '成分镜样例草莓酸奶',
    brand: '本地示例',
    barcode: '6900000000011',
    aliases: ['样例草莓酸奶', '成分镜样例酸奶', 'mock草莓酸奶'],
    frontKeywords: ['草莓酸奶', '酸奶', '风味发酵乳'],
    ingredientText: '生牛乳，白砂糖，草莓果酱，乳清蛋白粉，果胶，黄原胶，食用香精，保加利亚乳杆菌，嗜热链球菌。',
    nutritionText: '营养成分表 每100g 能量 360kJ 蛋白质 3.2g 脂肪 2.8g 碳水化合物 12.5g 糖 9.8g 钠 65mg'
  },
  {
    id: 'mock-soda-cracker',
    productName: '成分镜样例苏打饼干',
    brand: '本地示例',
    barcode: '6900000000028',
    aliases: ['样例苏打饼干', 'mock苏打饼干'],
    frontKeywords: ['苏打饼干', '饼干', '发酵饼干'],
    ingredientText: '小麦粉，精炼植物油，食用盐，白砂糖，碳酸氢钠，碳酸氢铵，酵母，食用香精。',
    nutritionText: '营养成分表 每100g 能量 1900kJ 蛋白质 8.5g 脂肪 16.0g 碳水化合物 68.0g 糖 7.0g 钠 620mg'
  },
  {
    id: 'mock-low-sugar-tea',
    productName: '成分镜样例低糖茶饮',
    brand: '本地示例',
    barcode: '6900000000035',
    aliases: ['样例低糖茶饮', 'mock低糖茶饮'],
    frontKeywords: ['低糖茶饮', '茶饮料', '低糖'],
    ingredientText: '水，乌龙茶茶汤，赤藓糖醇，三氯蔗糖，柠檬酸，柠檬酸钠，食用香精，维生素C。',
    nutritionText: '营养成分表 每100ml 能量 60kJ 蛋白质 0g 脂肪 0g 碳水化合物 3.0g 糖 1.2g 钠 35mg'
  }
];

export function findMockProductByText(text: string): MockProductRecord | undefined {
  const normalized = normalizeText(text);
  if (!normalized) return undefined;
  const digits = normalized.replace(/\D/g, '');
  return mockProducts.find((product) => {
    if (digits && digits.includes(product.barcode)) return true;
    const terms = [
      product.productName,
      product.barcode,
      ...product.aliases
    ].map(normalizeText).filter(Boolean);
    return terms.some((term) => normalized.includes(term));
  });
}

export function buildMockProductText(product: MockProductRecord): string {
  return [
    product.productName,
    `品牌：${product.brand}`,
    `条码：${product.barcode}`,
    `配料表：${product.ingredientText}`,
    product.nutritionText
  ].join('\n');
}

function normalizeText(value: string): string {
  return String(value || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}
