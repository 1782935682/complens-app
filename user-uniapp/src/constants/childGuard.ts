export type ChildGuardCategoryKey = 'preservative' | 'sweetener' | 'colorant';

export type ChildGuardCategory = {
  key: ChildGuardCategoryKey;
  label: string;
  terms: string[];
};

export const childGuardCategories: ChildGuardCategory[] = [
  {
    key: 'preservative',
    label: '防腐剂',
    terms: ['山梨酸', '苯甲酸', '丙酸', '脱羧', '防腐', '防坏', '亚硫酸盐', '防霉']
  },
  {
    key: 'sweetener',
    label: '甜味剂',
    terms: ['阿斯巴甜', '安赛蜜', '三氯蔗糖', '糖精', '甜菊', '甜味剂', '赤藓糖醇', '木糖醇', '甜味']
  },
  {
    key: 'colorant',
    label: '色素',
    terms: ['胭脂红', '柠檬黄', '焦糖色', '赤藓红', '橙色', '色素', '人工色']
  }
];
