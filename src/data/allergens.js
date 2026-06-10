/** @type {{ id: import('../types/ingredient.js').AllergenType, nameCn: string, nameEn: string, aliases: string[] }[]} */
export const standardAllergens = [
  { id: 'cereals-gluten', nameCn: '含麸质谷物', nameEn: 'Cereals containing gluten', aliases: ['小麦', '小麦粉', '黑麦', '大麦', '燕麦', '麦麸', '面筋', 'gluten'] },
  { id: 'crustaceans', nameCn: '甲壳类', nameEn: 'Crustaceans', aliases: ['虾', '虾粉', '蟹', '蟹粉', '甲壳动物', 'crab', 'shrimp'] },
  { id: 'eggs', nameCn: '蛋类', nameEn: 'Eggs', aliases: ['鸡蛋', '蛋黄', '蛋白', '蛋粉', '全蛋粉', 'egg', 'albumen'] },
  { id: 'fish', nameCn: '鱼类', nameEn: 'Fish', aliases: ['鱼', '鱼粉', '鱼露', '鱼胶', 'fish'] },
  { id: 'peanuts', nameCn: '花生', nameEn: 'Peanuts', aliases: ['花生仁', '花生粉', '花生酱', 'peanut'] },
  { id: 'soybeans', nameCn: '大豆', nameEn: 'Soybeans', aliases: ['大豆蛋白', '大豆粉', '豆粉', '豆浆', '豆乳', '豆腐', 'soy', 'soya'] },
  { id: 'milk', nameCn: '乳及乳制品', nameEn: 'Milk', aliases: ['牛奶', '奶粉', '乳粉', '乳糖', 'milk', 'lactose'] },
  { id: 'tree-nuts', nameCn: '坚果', nameEn: 'Tree nuts', aliases: ['杏仁', '榛子', '核桃', '腰果', '开心果', '扁桃仁', '松子', 'almond', 'walnut'] },
  { id: 'celery', nameCn: '芹菜', nameEn: 'Celery', aliases: ['芹菜籽', '芹菜粉', 'celery'] },
  { id: 'mustard', nameCn: '芥末', nameEn: 'Mustard', aliases: ['芥菜籽', '芥末粉', 'mustard'] },
  { id: 'sesame', nameCn: '芝麻', nameEn: 'Sesame', aliases: ['芝麻粉', '芝麻酱', 'sesame'] },
  { id: 'sulphites', nameCn: '二氧化硫和亚硫酸盐', nameEn: 'Sulphur dioxide and sulphites', aliases: ['亚硫酸盐', '二氧化硫', '焦亚硫酸钠', '亚硫酸氢钠', 'sulphite', 'sulfite'] },
  { id: 'lupin', nameCn: '羽扇豆', nameEn: 'Lupin', aliases: ['羽扇豆粉', '羽扇豆蛋白', 'lupin'] },
  { id: 'molluscs', nameCn: '软体动物', nameEn: 'Molluscs', aliases: ['贝类', '牡蛎', '蛤蜊', '扇贝', '鱿鱼', '章鱼', 'mollusc'] }
];

export const standardAllergenTypes = standardAllergens.map((allergen) => allergen.id);
