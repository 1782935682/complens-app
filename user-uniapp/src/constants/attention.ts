import type { AttentionGoal, AttentionSettings } from '@/types';

export const primaryGoalOptions: Array<{
  key: AttentionSettings['primaryGoal'];
  label: string;
  description: string;
  keywords: string[];
}> = [
  {
    key: 'daily',
    label: '日常',
    description: '默认关注添加剂、糖、钠和过敏原。',
    keywords: ['食品添加剂', '糖', '钠', '脂肪', '过敏原']
  },
  {
    key: 'sugar',
    label: '控糖',
    description: '重点看糖、糖浆、甜味剂和碳水。',
    keywords: ['白砂糖', '蔗糖', '果葡糖浆', '葡萄糖浆', '麦芽糖浆', '麦芽糊精', '浓缩果汁', '甜味剂', '碳水化合物', '糖']
  },
  {
    key: 'fatLoss',
    label: '减脂',
    description: '重点看热量、脂肪、糖和碳水。',
    keywords: ['能量', '热量', '脂肪', '饱和脂肪', '反式脂肪', '植脂末', '代可可脂', '糖', '碳水化合物']
  },
  {
    key: 'lowSodium',
    label: '低钠/少盐',
    description: '重点看钠、盐和含钠配料。',
    keywords: ['钠', '食盐', '食用盐', '酱油粉', '味精', '谷氨酸钠', '呈味核苷酸', '复合调味料', '碳酸氢钠']
  }
];

export const childrenModeKeywords = ['高糖', '糖', '甜味剂', '色素', '咖啡因', '高钠', '钠', '酒精'];

export const attentionTargetOptions: Array<{
  key: AttentionSettings['primaryGoal'] | AttentionGoal;
  label: string;
  description: string;
}> = [
  {
    key: 'daily',
    label: '日常综合',
    description: '默认看添加剂、糖、钠、脂肪和过敏原。'
  },
  ...primaryGoalOptions.filter((item) => item.key !== 'daily'),
  {
    key: 'children',
    label: '儿童零食',
    description: '把甜味剂、色素、咖啡因、高糖高钠放前面。'
  }
];

export const allergenOptions: Array<{ key: string; label: string; keywords: string[] }> = [
  { key: 'peanut', label: '花生', keywords: ['花生', 'peanut', 'peanuts'] },
  { key: 'nuts', label: '坚果', keywords: ['坚果', '杏仁', '核桃', '腰果', '榛子', '开心果', 'tree nuts', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio'] },
  { key: 'milk', label: '牛奶', keywords: ['牛奶', '乳粉', '奶粉', '乳清', '乳糖', '奶油', '炼乳', '乳制品', 'milk', 'dairy', 'whey', 'lactose', 'cream'] },
  { key: 'soy', label: '大豆', keywords: ['大豆', '黄豆', '豆粉', '豆乳', '大豆磷脂', 'soy', 'soya', 'soybean', 'soy lecithin'] },
  { key: 'gluten', label: '麸质', keywords: ['麸质', '小麦', '麦麸', '面粉', '燕麦', 'gluten', 'wheat', 'oat', 'barley', 'rye'] },
  { key: 'egg', label: '鸡蛋', keywords: ['鸡蛋', '蛋黄', '蛋清', '全蛋', '蛋粉', '蛋类', 'egg', 'eggs', 'albumen'] },
  { key: 'fish', label: '鱼类', keywords: ['鱼', '鱼肉', '鱼粉', 'fish'] },
  { key: 'shellfish', label: '虾蟹类', keywords: ['虾', '蟹', '贝类', '甲壳类', 'shrimp', 'crab', 'shellfish', 'crustacean'] }
];

export const defaultAttentionSettings: AttentionSettings = {
  primaryGoal: 'daily',
  targetGoals: [],
  isChildrenMode: false,
  allergens: [],
  updatedAt: new Date().toISOString()
};
