export type DemoFoodLabelSample = {
  id: string;
  title: string;
  text: string;
};

export const demoFoodLabelSamples: DemoFoodLabelSample[] = [
  {
    id: 'demo-orange-drink',
    title: '示例橙味饮料',
    text: [
      '配料表：水、白砂糖、果葡糖浆、浓缩橙汁、食品添加剂（三氯蔗糖、安赛蜜、山梨酸钾、苯甲酸钠、柠檬酸、焦糖色）、食用香精。',
      '营养成分表 每100ml：能量 190kJ，蛋白质 0g，脂肪 0g，碳水化合物 11.2g，糖 10.8g，钠 36mg。',
      '致敏原提示：本品可能含有微量牛奶和大豆成分。'
    ].join('\n')
  },
  {
    id: 'demo-simple-yogurt',
    title: '示例原味酸奶',
    text: [
      '配料表：生牛乳、乳酸菌。',
      '营养成分表 每100g：能量 280kJ，蛋白质 3.4g，脂肪 3.2g，碳水化合物 4.8g，糖 4.8g，钠 55mg。',
      '致敏原提示：含有牛奶。'
    ].join('\n')
  }
];

export function pickDemoFoodLabelSample(seed = 0): DemoFoodLabelSample {
  return demoFoodLabelSamples[Math.abs(seed) % demoFoodLabelSamples.length];
}
