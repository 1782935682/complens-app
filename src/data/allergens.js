/** @type {{ id: import('../types/ingredient.js').AllergenType, nameCn: string, nameEn: string, aliases: string[] }[]} */
export const standardAllergens = [
  { id: 'cereals-gluten', nameCn: '含麸质谷物', nameEn: 'Cereals containing gluten', aliases: ['小麦', '黑麦', '大麦', '燕麦', 'gluten'] },
  { id: 'crustaceans', nameCn: '甲壳类', nameEn: 'Crustaceans', aliases: ['虾', '蟹', 'crab', 'shrimp'] },
  { id: 'eggs', nameCn: '蛋类', nameEn: 'Eggs', aliases: ['鸡蛋', 'egg'] },
  { id: 'fish', nameCn: '鱼类', nameEn: 'Fish', aliases: ['fish'] },
  { id: 'peanuts', nameCn: '花生', nameEn: 'Peanuts', aliases: ['peanut'] },
  { id: 'soybeans', nameCn: '大豆', nameEn: 'Soybeans', aliases: ['soy', 'soya'] },
  { id: 'milk', nameCn: '乳及乳制品', nameEn: 'Milk', aliases: ['牛奶', '奶粉', '乳粉', '乳糖', 'milk', 'lactose'] },
  { id: 'tree-nuts', nameCn: '坚果', nameEn: 'Tree nuts', aliases: ['杏仁', '榛子', '核桃', '腰果', 'almond', 'walnut'] },
  { id: 'celery', nameCn: '芹菜', nameEn: 'Celery', aliases: ['celery'] },
  { id: 'mustard', nameCn: '芥末', nameEn: 'Mustard', aliases: ['mustard'] },
  { id: 'sesame', nameCn: '芝麻', nameEn: 'Sesame', aliases: ['sesame'] },
  { id: 'sulphites', nameCn: '二氧化硫和亚硫酸盐', nameEn: 'Sulphur dioxide and sulphites', aliases: ['亚硫酸盐', 'sulphite', 'sulfite'] },
  { id: 'lupin', nameCn: '羽扇豆', nameEn: 'Lupin', aliases: ['lupin'] },
  { id: 'molluscs', nameCn: '软体动物', nameEn: 'Molluscs', aliases: ['贝类', 'mollusc'] }
];

export const standardAllergenTypes = standardAllergens.map((allergen) => allergen.id);
