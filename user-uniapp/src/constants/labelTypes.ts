import type { LabelType } from '@/types';

export const labelTypeLabels: Record<LabelType, string> = {
  ingredient_list: '配料表',
  nutrition_facts: '营养成分表',
  front_claims: '包装正面',
  unknown_label: '未知标签'
};

export const labelTypeActions: Array<{ type: LabelType; label: string; description: string }> = [
  {
    type: 'ingredient_list',
    label: '这是配料表',
    description: '用于拆分配料、识别食品添加剂和关注项。'
  },
  {
    type: 'nutrition_facts',
    label: '这是营养成分表',
    description: '用于解析能量、蛋白质、脂肪、糖和钠。'
  },
  {
    type: 'front_claims',
    label: '这是包装正面',
    description: '用于记录 0 糖、低脂、高蛋白等包装文案，当前作为补充信息。'
  },
  {
    type: 'unknown_label',
    label: '重新拍',
    description: '图片不是食品标签或内容不清晰时返回拍照页。'
  }
];
