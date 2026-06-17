export type P0LabelDebugExpectation =
  | 'ingredient'
  | 'nutrition'
  | 'allergen'
  | 'lowConfidence'
  | 'alias'
  | 'demo'
  | 'historyLru'
  | 'rulesFallback'
  | 'productInfoFiltered';

export type P0LabelDebugSample = {
  id: string;
  title: string;
  text: string;
  expected: P0LabelDebugExpectation[];
};

export const p0LabelDebugSamples: P0LabelDebugSample[] = [
  {
    id: 'clean-ingredient',
    title: '干净配料表',
    text: '配料表：水、白砂糖、乳粉、黄原胶、食用香精。',
    expected: ['ingredient', 'alias']
  },
  {
    id: 'ad-mixed',
    title: '混入广告语',
    text: '0蔗糖 低脂 高蛋白\n配料表：水、赤藓糖醇、三氯蔗糖、柠檬酸。',
    expected: ['ingredient']
  },
  {
    id: 'factory-mixed',
    title: '混入生产和厂家信息',
    text: '净含量：500ml\n生产日期见瓶身\n地址：某某路\n配料：水、果葡糖浆、山梨酸钾、苯甲酸钠。',
    expected: ['ingredient', 'alias', 'productInfoFiltered']
  },
  {
    id: 'package-info-before-ingredient',
    title: '产品信息在配料表前',
    text: '产品名称：草莓味发酵乳\n净含量：200g\n规格：1杯\n配料表：生牛乳、白砂糖、草莓果酱、果胶、食用香精。\n生产商：某某食品有限公司',
    expected: ['ingredient', 'productInfoFiltered']
  },
  {
    id: 'package-info-only',
    title: '只有产品包装信息',
    text: '产品名称：草莓味发酵乳\n净含量：200g\n生产日期：见包装\n保质期：21天\n食品生产许可证编号：SC12345678901234\n地址：某某工业园',
    expected: ['lowConfidence', 'productInfoFiltered']
  },
  {
    id: 'ingredient-nutrition',
    title: '配料和营养混排',
    text: '配料表：小麦粉、植物油、白砂糖、碳酸氢钠。\n营养成分表 每100g 能量 1850kJ 蛋白质 7g 脂肪 18g 碳水化合物 62g 钠 480mg。',
    expected: ['ingredient', 'nutrition']
  },
  {
    id: 'traditional',
    title: '繁体中文标签',
    text: '成份：水、白砂糖、檸檬酸、食用香料。\n營養成分 每100ml 能量 160kJ 蛋白質 0g 脂肪 0g 鈉 30mg。',
    expected: ['ingredient', 'nutrition']
  },
  {
    id: 'english',
    title: '英文标签',
    text: 'INGREDIENTS: Water, Sugar, Sucralose, Potassium Sorbate, Xanthan Gum.\nNutrition Facts per 100ml Energy 120kJ Protein 0g Fat 0g Carbohydrate 7g Sugars 6.8g Sodium 28mg.\nContains milk. May contain soy.',
    expected: ['ingredient', 'nutrition', 'allergen', 'alias']
  },
  {
    id: 'ocr-typo',
    title: 'OCR 错别字',
    text: '配料衰：水、白秒糖、食用香精、焦糖色素。',
    expected: ['ingredient', 'alias']
  },
  {
    id: 'nutrition-only',
    title: '只有营养表',
    text: '营养成分表 每100g 能量 900kJ 蛋白质 6g 脂肪 8g 碳水化合物 22g 糖 12g 钠 300mg。',
    expected: ['nutrition', 'lowConfidence']
  },
  {
    id: 'ad-only',
    title: '只有广告语',
    text: '0蔗糖 低脂 高蛋白 非油炸 轻负担 饱腹',
    expected: ['lowConfidence']
  },
  {
    id: 'allergen',
    title: '含致敏原提示',
    text: '配料表：小麦粉、白砂糖、植物油。\n致敏原提示：含有小麦、牛奶和大豆，可能含有花生。',
    expected: ['ingredient', 'allergen']
  },
  {
    id: 'demo',
    title: 'Demo 样例',
    text: '配料表：水、白砂糖、果葡糖浆、三氯蔗糖、安赛蜜、山梨酸钾。',
    expected: ['ingredient', 'alias', 'demo']
  },
  {
    id: 'special-emulsifier',
    title: '特殊成分：单，双甘油脂肪酸酯',
    text: "配料表：小麦粉、白砂糖、单，双甘油脂肪酸酯、5'-呈味核苷酸二钠、食用香精。",
    expected: ['ingredient', 'alias']
  },
  {
    id: 'english-additive-alias',
    title: '英文添加剂别名',
    text: "INGREDIENTS: Water, Mono- and Diglycerides, CMC, Disodium 5'-ribonucleotide, Caramel Color.\nNutrition Information per 100g Energy 800kJ Protein 5g Total Fat 8g Sodium 260mg Salt 0.7g.",
    expected: ['ingredient', 'nutrition', 'alias']
  },
  {
    id: 'history-overflow',
    title: '历史记录超过 20 条',
    text: '用于本地调试：连续保存 21 条报告时，应只保留最近 20 条且不保存图片路径。',
    expected: ['historyLru']
  },
  {
    id: 'rules-loader-fallback',
    title: '规则库加载失败 fallback',
    text: '用于本地调试：远程 rules_dictionary.json 为空或不可用时，应继续使用本地默认添加剂规则。',
    expected: ['rulesFallback']
  }
];
