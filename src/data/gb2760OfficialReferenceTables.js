import { gb2760OfficialStagingSource } from './gb2760OfficialStaging.js';

export const gb2760OfficialReferenceTableSource = {
  ...gb2760OfficialStagingSource,
  extractionTool: "pdftotext -bbox-layout (poppler-utils)",
  extractionScope: 'official_reference_tables_structured',
  generatedAt: "2026-06-13"
};

export const gb2760OfficialA2ExceptionFoodCategories = [
  {
    "id": "gb2760-2024-a2-exception-001",
    "exceptionNumber": 1,
    "foodCategoryCode": "01.01.01",
    "foodCategoryName": "巴氏杀菌乳",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 1；食品分类号 01.01.01；食品名称 巴氏杀菌乳。"
  },
  {
    "id": "gb2760-2024-a2-exception-002",
    "exceptionNumber": 2,
    "foodCategoryCode": "01.01.02",
    "foodCategoryName": "灭菌乳和高温杀菌乳",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 2；食品分类号 01.01.02；食品名称 灭菌乳和高温杀菌乳。"
  },
  {
    "id": "gb2760-2024-a2-exception-003",
    "exceptionNumber": 3,
    "foodCategoryCode": "01.02.01",
    "foodCategoryName": "发酵乳",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 3；食品分类号 01.02.01；食品名称 发酵乳。"
  },
  {
    "id": "gb2760-2024-a2-exception-004",
    "exceptionNumber": 4,
    "foodCategoryCode": "01.03.01",
    "foodCategoryName": "乳粉和奶油粉",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 4；食品分类号 01.03.01；食品名称 乳粉和奶油粉。"
  },
  {
    "id": "gb2760-2024-a2-exception-005",
    "exceptionNumber": 5,
    "foodCategoryCode": "01.05.01",
    "foodCategoryName": "稀奶油",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 5；食品分类号 01.05.01；食品名称 稀奶油。"
  },
  {
    "id": "gb2760-2024-a2-exception-006",
    "exceptionNumber": 6,
    "foodCategoryCode": "02.01.01.01",
    "foodCategoryName": "植物油",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 6；食品分类号 02.01.01.01；食品名称 植物油。"
  },
  {
    "id": "gb2760-2024-a2-exception-007",
    "exceptionNumber": 7,
    "foodCategoryCode": "02.01.01.02",
    "foodCategoryName": "氢化植物油",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 7；食品分类号 02.01.01.02；食品名称 氢化植物油。"
  },
  {
    "id": "gb2760-2024-a2-exception-008",
    "exceptionNumber": 8,
    "foodCategoryCode": "02.01.02",
    "foodCategoryName": "动物油脂(包括猪油、牛油、鱼油和其他动物脂肪等)",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 8；食品分类号 02.01.02；食品名称 动物油脂(包括猪油、牛油、鱼油和其他动物脂肪等)。"
  },
  {
    "id": "gb2760-2024-a2-exception-009",
    "exceptionNumber": 9,
    "foodCategoryCode": "02.01.03",
    "foodCategoryName": "无水黄油、无水乳脂",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 9；食品分类号 02.01.03；食品名称 无水黄油、无水乳脂。"
  },
  {
    "id": "gb2760-2024-a2-exception-010",
    "exceptionNumber": 10,
    "foodCategoryCode": "02.02.01.01",
    "foodCategoryName": "黄油和浓缩黄油",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 10；食品分类号 02.02.01.01；食品名称 黄油和浓缩黄油。"
  },
  {
    "id": "gb2760-2024-a2-exception-011",
    "exceptionNumber": 11,
    "foodCategoryCode": "04.01.01.01",
    "foodCategoryName": "未经加工的鲜水果",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 11；食品分类号 04.01.01.01；食品名称 未经加工的鲜水果。"
  },
  {
    "id": "gb2760-2024-a2-exception-012",
    "exceptionNumber": 12,
    "foodCategoryCode": "04.01.01.02",
    "foodCategoryName": "经表面处理的鲜水果",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 12；食品分类号 04.01.01.02；食品名称 经表面处理的鲜水果。"
  },
  {
    "id": "gb2760-2024-a2-exception-013",
    "exceptionNumber": 13,
    "foodCategoryCode": "04.01.01.03",
    "foodCategoryName": "去皮或预切的鲜水果",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 13；食品分类号 04.01.01.03；食品名称 去皮或预切的鲜水果。"
  },
  {
    "id": "gb2760-2024-a2-exception-014",
    "exceptionNumber": 14,
    "foodCategoryCode": "04.02.01.01",
    "foodCategoryName": "未经加工的鲜蔬菜",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 14；食品分类号 04.02.01.01；食品名称 未经加工的鲜蔬菜。"
  },
  {
    "id": "gb2760-2024-a2-exception-015",
    "exceptionNumber": 15,
    "foodCategoryCode": "04.02.01.02",
    "foodCategoryName": "经表面处理的新鲜蔬菜",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 15；食品分类号 04.02.01.02；食品名称 经表面处理的新鲜蔬菜。"
  },
  {
    "id": "gb2760-2024-a2-exception-016",
    "exceptionNumber": 16,
    "foodCategoryCode": "04.02.01.03",
    "foodCategoryName": "去皮、切块或切丝的蔬菜",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 16；食品分类号 04.02.01.03；食品名称 去皮、切块或切丝的蔬菜。"
  },
  {
    "id": "gb2760-2024-a2-exception-017",
    "exceptionNumber": 17,
    "foodCategoryCode": "04.02.01.04",
    "foodCategoryName": "芽菜类",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 17；食品分类号 04.02.01.04；食品名称 芽菜类。"
  },
  {
    "id": "gb2760-2024-a2-exception-018",
    "exceptionNumber": 18,
    "foodCategoryCode": "04.02.02.01",
    "foodCategoryName": "冷冻蔬菜",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 18；食品分类号 04.02.02.01；食品名称 冷冻蔬菜。"
  },
  {
    "id": "gb2760-2024-a2-exception-019",
    "exceptionNumber": 19,
    "foodCategoryCode": "04.02.02.06",
    "foodCategoryName": "发酵蔬菜制品",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 19；食品分类号 04.02.02.06；食品名称 发酵蔬菜制品。"
  },
  {
    "id": "gb2760-2024-a2-exception-020",
    "exceptionNumber": 20,
    "foodCategoryCode": "04.03.01.01",
    "foodCategoryName": "未经加工鲜食用菌和藻类",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 20；食品分类号 04.03.01.01；食品名称 未经加工鲜食用菌和藻类。"
  },
  {
    "id": "gb2760-2024-a2-exception-021",
    "exceptionNumber": 21,
    "foodCategoryCode": "04.03.01.02",
    "foodCategoryName": "经表面处理的鲜食用菌和藻类",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 21；食品分类号 04.03.01.02；食品名称 经表面处理的鲜食用菌和藻类。"
  },
  {
    "id": "gb2760-2024-a2-exception-022",
    "exceptionNumber": 22,
    "foodCategoryCode": "04.03.01.03",
    "foodCategoryName": "去皮、切块或切丝的食用菌和藻类",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 22；食品分类号 04.03.01.03；食品名称 去皮、切块或切丝的食用菌和藻类。"
  },
  {
    "id": "gb2760-2024-a2-exception-023",
    "exceptionNumber": 23,
    "foodCategoryCode": "04.03.02.01",
    "foodCategoryName": "冷冻食用菌和藻类",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 23；食品分类号 04.03.02.01；食品名称 冷冻食用菌和藻类。"
  },
  {
    "id": "gb2760-2024-a2-exception-024",
    "exceptionNumber": 24,
    "foodCategoryCode": "06.01",
    "foodCategoryName": "原粮",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 24；食品分类号 06.01；食品名称 原粮。"
  },
  {
    "id": "gb2760-2024-a2-exception-025",
    "exceptionNumber": 25,
    "foodCategoryCode": "06.02.01",
    "foodCategoryName": "大米",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 25；食品分类号 06.02.01；食品名称 大米。"
  },
  {
    "id": "gb2760-2024-a2-exception-026",
    "exceptionNumber": 26,
    "foodCategoryCode": "06.02.02",
    "foodCategoryName": "大米制品",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 26；食品分类号 06.02.02；食品名称 大米制品。"
  },
  {
    "id": "gb2760-2024-a2-exception-027",
    "exceptionNumber": 27,
    "foodCategoryCode": "06.02.03",
    "foodCategoryName": "米粉(包括汤圆粉等)",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 27；食品分类号 06.02.03；食品名称 米粉(包括汤圆粉等)。"
  },
  {
    "id": "gb2760-2024-a2-exception-028",
    "exceptionNumber": 28,
    "foodCategoryCode": "06.02.04",
    "foodCategoryName": "米粉制品",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 28；食品分类号 06.02.04；食品名称 米粉制品。"
  },
  {
    "id": "gb2760-2024-a2-exception-029",
    "exceptionNumber": 29,
    "foodCategoryCode": "06.03.01.01",
    "foodCategoryName": "通用小麦粉",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 29；食品分类号 06.03.01.01；食品名称 通用小麦粉。"
  },
  {
    "id": "gb2760-2024-a2-exception-030",
    "exceptionNumber": 30,
    "foodCategoryCode": "06.03.01.02",
    "foodCategoryName": "专用小麦粉(如自发粉、饺子粉等)",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 30；食品分类号 06.03.01.02；食品名称 专用小麦粉(如自发粉、饺子粉等)。"
  },
  {
    "id": "gb2760-2024-a2-exception-031",
    "exceptionNumber": 31,
    "foodCategoryCode": "06.03.02.01",
    "foodCategoryName": "生湿面制品(面条、饺子皮、馄饨皮、烧麦皮)",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 31；食品分类号 06.03.02.01；食品名称 生湿面制品(面条、饺子皮、馄饨皮、烧麦皮)。"
  },
  {
    "id": "gb2760-2024-a2-exception-032",
    "exceptionNumber": 32,
    "foodCategoryCode": "06.03.02.02",
    "foodCategoryName": "生干面制品",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 32；食品分类号 06.03.02.02；食品名称 生干面制品。"
  },
  {
    "id": "gb2760-2024-a2-exception-033",
    "exceptionNumber": 33,
    "foodCategoryCode": "06.04.01",
    "foodCategoryName": "杂粮粉",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 33；食品分类号 06.04.01；食品名称 杂粮粉。"
  },
  {
    "id": "gb2760-2024-a2-exception-034",
    "exceptionNumber": 34,
    "foodCategoryCode": "08.01.01",
    "foodCategoryName": "生鲜肉",
    "pdfPage": 149,
    "standardPage": 146,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 34；食品分类号 08.01.01；食品名称 生鲜肉。"
  },
  {
    "id": "gb2760-2024-a2-exception-035",
    "exceptionNumber": 35,
    "foodCategoryCode": "08.01.02",
    "foodCategoryName": "冷却肉、冰鲜肉",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 35；食品分类号 08.01.02；食品名称 冷却肉、冰鲜肉。"
  },
  {
    "id": "gb2760-2024-a2-exception-036",
    "exceptionNumber": 36,
    "foodCategoryCode": "08.01.03",
    "foodCategoryName": "冻肉",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 36；食品分类号 08.01.03；食品名称 冻肉。"
  },
  {
    "id": "gb2760-2024-a2-exception-037",
    "exceptionNumber": 37,
    "foodCategoryCode": "09.01",
    "foodCategoryName": "鲜水产",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 37；食品分类号 09.01；食品名称 鲜水产。"
  },
  {
    "id": "gb2760-2024-a2-exception-038",
    "exceptionNumber": 38,
    "foodCategoryCode": "09.03.01",
    "foodCategoryName": "醋渍或肉冻状水产品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 38；食品分类号 09.03.01；食品名称 醋渍或肉冻状水产品。"
  },
  {
    "id": "gb2760-2024-a2-exception-039",
    "exceptionNumber": 39,
    "foodCategoryCode": "09.03.02",
    "foodCategoryName": "腌制水产品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 39；食品分类号 09.03.02；食品名称 腌制水产品。"
  },
  {
    "id": "gb2760-2024-a2-exception-040",
    "exceptionNumber": 40,
    "foodCategoryCode": "09.03.03",
    "foodCategoryName": "鱼子制品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 40；食品分类号 09.03.03；食品名称 鱼子制品。"
  },
  {
    "id": "gb2760-2024-a2-exception-041",
    "exceptionNumber": 41,
    "foodCategoryCode": "09.03.04",
    "foodCategoryName": "风干、烘干、压干等水产品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 41；食品分类号 09.03.04；食品名称 风干、烘干、压干等水产品。"
  },
  {
    "id": "gb2760-2024-a2-exception-042",
    "exceptionNumber": 42,
    "foodCategoryCode": "09.03.05",
    "foodCategoryName": "其他预制水产品(如鱼肉饺皮)",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 42；食品分类号 09.03.05；食品名称 其他预制水产品(如鱼肉饺皮)。"
  },
  {
    "id": "gb2760-2024-a2-exception-043",
    "exceptionNumber": 43,
    "foodCategoryCode": "10.01",
    "foodCategoryName": "鲜蛋",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 43；食品分类号 10.01；食品名称 鲜蛋。"
  },
  {
    "id": "gb2760-2024-a2-exception-044",
    "exceptionNumber": 44,
    "foodCategoryCode": "10.03.01",
    "foodCategoryName": "脱水蛋制品(如蛋白粉、蛋黄粉、蛋白片)",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 44；食品分类号 10.03.01；食品名称 脱水蛋制品(如蛋白粉、蛋黄粉、蛋白片)。"
  },
  {
    "id": "gb2760-2024-a2-exception-045",
    "exceptionNumber": 45,
    "foodCategoryCode": "10.03.03",
    "foodCategoryName": "蛋液与液态蛋",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 45；食品分类号 10.03.03；食品名称 蛋液与液态蛋。"
  },
  {
    "id": "gb2760-2024-a2-exception-046",
    "exceptionNumber": 46,
    "foodCategoryCode": "11.01.01",
    "foodCategoryName": "白砂糖及白砂糖制品、绵白糖、红糖、冰片糖",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 46；食品分类号 11.01.01；食品名称 白砂糖及白砂糖制品、绵白糖、红糖、冰片糖。"
  },
  {
    "id": "gb2760-2024-a2-exception-047",
    "exceptionNumber": 47,
    "foodCategoryCode": "11.01.02",
    "foodCategoryName": "赤砂糖、原糖、其他糖和糖浆",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 47；食品分类号 11.01.02；食品名称 赤砂糖、原糖、其他糖和糖浆。"
  },
  {
    "id": "gb2760-2024-a2-exception-048",
    "exceptionNumber": 48,
    "foodCategoryCode": "11.03.01",
    "foodCategoryName": "蜂蜜",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 48；食品分类号 11.03.01；食品名称 蜂蜜。"
  },
  {
    "id": "gb2760-2024-a2-exception-049",
    "exceptionNumber": 49,
    "foodCategoryCode": "12.01",
    "foodCategoryName": "盐及代盐制品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 49；食品分类号 12.01；食品名称 盐及代盐制品。"
  },
  {
    "id": "gb2760-2024-a2-exception-050",
    "exceptionNumber": 50,
    "foodCategoryCode": "12.09.01",
    "foodCategoryName": "香辛料及粉",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 50；食品分类号 12.09.01；食品名称 香辛料及粉。"
  },
  {
    "id": "gb2760-2024-a2-exception-051",
    "exceptionNumber": 51,
    "foodCategoryCode": "12.09.02",
    "foodCategoryName": "香辛料油",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 51；食品分类号 12.09.02；食品名称 香辛料油。"
  },
  {
    "id": "gb2760-2024-a2-exception-052",
    "exceptionNumber": 52,
    "foodCategoryCode": "12.09.03",
    "foodCategoryName": "香辛料酱(如芥末酱、青芥酱)",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 52；食品分类号 12.09.03；食品名称 香辛料酱(如芥末酱、青芥酱)。"
  },
  {
    "id": "gb2760-2024-a2-exception-053",
    "exceptionNumber": 53,
    "foodCategoryCode": "12.09.04",
    "foodCategoryName": "其他香辛料加工品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 53；食品分类号 12.09.04；食品名称 其他香辛料加工品。"
  },
  {
    "id": "gb2760-2024-a2-exception-054",
    "exceptionNumber": 54,
    "foodCategoryCode": "13.01.01",
    "foodCategoryName": "婴儿配方食品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 54；食品分类号 13.01.01；食品名称 婴儿配方食品。"
  },
  {
    "id": "gb2760-2024-a2-exception-055",
    "exceptionNumber": 55,
    "foodCategoryCode": "13.01.02",
    "foodCategoryName": "较大婴儿和幼儿配方食品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 55；食品分类号 13.01.02；食品名称 较大婴儿和幼儿配方食品。"
  },
  {
    "id": "gb2760-2024-a2-exception-056",
    "exceptionNumber": 56,
    "foodCategoryCode": "13.01.03",
    "foodCategoryName": "特殊医学用途婴儿配方食品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 56；食品分类号 13.01.03；食品名称 特殊医学用途婴儿配方食品。"
  },
  {
    "id": "gb2760-2024-a2-exception-057",
    "exceptionNumber": 57,
    "foodCategoryCode": "13.02.01",
    "foodCategoryName": "婴幼儿谷类辅助食品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 57；食品分类号 13.02.01；食品名称 婴幼儿谷类辅助食品。"
  },
  {
    "id": "gb2760-2024-a2-exception-058",
    "exceptionNumber": 58,
    "foodCategoryCode": "13.02.02",
    "foodCategoryName": "婴幼儿罐装辅助食品",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 58；食品分类号 13.02.02；食品名称 婴幼儿罐装辅助食品。"
  },
  {
    "id": "gb2760-2024-a2-exception-059",
    "exceptionNumber": 59,
    "foodCategoryCode": "14.01.01",
    "foodCategoryName": "饮用天然矿泉水",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 59；食品分类号 14.01.01；食品名称 饮用天然矿泉水。"
  },
  {
    "id": "gb2760-2024-a2-exception-060",
    "exceptionNumber": 60,
    "foodCategoryCode": "14.01.02",
    "foodCategoryName": "饮用纯净水",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 60；食品分类号 14.01.02；食品名称 饮用纯净水。"
  },
  {
    "id": "gb2760-2024-a2-exception-061",
    "exceptionNumber": 61,
    "foodCategoryCode": "14.01.03",
    "foodCategoryName": "其他类饮用水",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 61；食品分类号 14.01.03；食品名称 其他类饮用水。"
  },
  {
    "id": "gb2760-2024-a2-exception-062",
    "exceptionNumber": 62,
    "foodCategoryCode": "14.02.01",
    "foodCategoryName": "果蔬汁(浆)",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 62；食品分类号 14.02.01；食品名称 果蔬汁(浆)。"
  },
  {
    "id": "gb2760-2024-a2-exception-063",
    "exceptionNumber": 63,
    "foodCategoryCode": "14.02.02",
    "foodCategoryName": "浓缩果蔬汁(浆)",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 63；食品分类号 14.02.02；食品名称 浓缩果蔬汁(浆)。"
  },
  {
    "id": "gb2760-2024-a2-exception-064",
    "exceptionNumber": 64,
    "foodCategoryCode": "15.03.01.01",
    "foodCategoryName": "无汽葡萄酒",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 64；食品分类号 15.03.01.01；食品名称 无汽葡萄酒。"
  },
  {
    "id": "gb2760-2024-a2-exception-065",
    "exceptionNumber": 65,
    "foodCategoryCode": "15.03.01.02",
    "foodCategoryName": "起泡葡萄酒",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 65；食品分类号 15.03.01.02；食品名称 起泡葡萄酒。"
  },
  {
    "id": "gb2760-2024-a2-exception-066",
    "exceptionNumber": 66,
    "foodCategoryCode": "15.03.01.03",
    "foodCategoryName": "调香葡萄酒",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 66；食品分类号 15.03.01.03；食品名称 调香葡萄酒。"
  },
  {
    "id": "gb2760-2024-a2-exception-067",
    "exceptionNumber": 67,
    "foodCategoryCode": "15.03.01.04",
    "foodCategoryName": "特种葡萄酒(按特殊工艺加工制作的葡萄酒,如在葡萄原酒中加入白兰地、浓缩葡萄汁等)",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 67；食品分类号 15.03.01.04；食品名称 特种葡萄酒(按特殊工艺加工制作的葡萄酒,如在葡萄原酒中加入白兰地、浓缩葡萄汁等)。"
  },
  {
    "id": "gb2760-2024-a2-exception-068",
    "exceptionNumber": 68,
    "foodCategoryCode": "16.02.01",
    "foodCategoryName": "茶叶、咖啡",
    "pdfPage": 150,
    "standardPage": 147,
    "rawSourceText": "GB 2760-2024 表 A.2：例外食品类别编号 68；食品分类号 16.02.01；食品名称 茶叶、咖啡。"
  }
];

export const gb2760OfficialB1NoFlavorFoodCategories = [
  {
    "id": "gb2760-2024-b1-no-flavor-001",
    "rowNumber": 1,
    "foodCategoryCode": "01.01.01",
    "foodCategoryName": "巴氏杀菌乳",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 01.01.01；食品名称 巴氏杀菌乳；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-002",
    "rowNumber": 2,
    "foodCategoryCode": "01.01.02",
    "foodCategoryName": "灭菌乳和高温杀菌乳",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 01.01.02；食品名称 灭菌乳和高温杀菌乳；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-003",
    "rowNumber": 3,
    "foodCategoryCode": "01.02.01",
    "foodCategoryName": "发酵乳",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 01.02.01；食品名称 发酵乳；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-004",
    "rowNumber": 4,
    "foodCategoryCode": "01.05.01",
    "foodCategoryName": "稀奶油",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 01.05.01；食品名称 稀奶油；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-005",
    "rowNumber": 5,
    "foodCategoryCode": "02.01.01",
    "foodCategoryName": "植物油脂",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 02.01.01；食品名称 植物油脂；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-006",
    "rowNumber": 6,
    "foodCategoryCode": "02.01.02",
    "foodCategoryName": "动物油脂(包括猪油、牛油、鱼油和其他动物脂肪等)",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 02.01.02；食品名称 动物油脂(包括猪油、牛油、鱼油和其他动物脂肪等)；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-007",
    "rowNumber": 7,
    "foodCategoryCode": "02.01.03",
    "foodCategoryName": "无水黄油、无水乳脂",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 02.01.03；食品名称 无水黄油、无水乳脂；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-008",
    "rowNumber": 8,
    "foodCategoryCode": "04.01.01",
    "foodCategoryName": "新鲜水果",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 04.01.01；食品名称 新鲜水果；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-009",
    "rowNumber": 9,
    "foodCategoryCode": "04.02.01",
    "foodCategoryName": "新鲜蔬菜",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 04.02.01；食品名称 新鲜蔬菜；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-010",
    "rowNumber": 10,
    "foodCategoryCode": "04.02.02.01",
    "foodCategoryName": "冷冻蔬菜",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 04.02.02.01；食品名称 冷冻蔬菜；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-011",
    "rowNumber": 11,
    "foodCategoryCode": "04.03.01",
    "foodCategoryName": "新鲜食用菌和藻类",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 04.03.01；食品名称 新鲜食用菌和藻类；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-012",
    "rowNumber": 12,
    "foodCategoryCode": "04.03.02.01",
    "foodCategoryName": "冷冻食用菌和藻类",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 04.03.02.01；食品名称 冷冻食用菌和藻类；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-013",
    "rowNumber": 13,
    "foodCategoryCode": "06.01",
    "foodCategoryName": "原粮",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 06.01；食品名称 原粮；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-014",
    "rowNumber": 14,
    "foodCategoryCode": "06.02.01",
    "foodCategoryName": "大米",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 06.02.01；食品名称 大米；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-015",
    "rowNumber": 15,
    "foodCategoryCode": "06.03.01",
    "foodCategoryName": "小麦粉",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 06.03.01；食品名称 小麦粉；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-016",
    "rowNumber": 16,
    "foodCategoryCode": "06.04.01",
    "foodCategoryName": "杂粮粉",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 06.04.01；食品名称 杂粮粉；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-017",
    "rowNumber": 17,
    "foodCategoryCode": "06.05.01",
    "foodCategoryName": "食用淀粉",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 06.05.01；食品名称 食用淀粉；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-018",
    "rowNumber": 18,
    "foodCategoryCode": "08.01",
    "foodCategoryName": "生、鲜肉",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 08.01；食品名称 生、鲜肉；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-019",
    "rowNumber": 19,
    "foodCategoryCode": "09.01",
    "foodCategoryName": "鲜水产",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 09.01；食品名称 鲜水产；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-020",
    "rowNumber": 20,
    "foodCategoryCode": "10.01",
    "foodCategoryName": "鲜蛋",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 10.01；食品名称 鲜蛋；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-021",
    "rowNumber": 21,
    "foodCategoryCode": "11.01",
    "foodCategoryName": "食糖",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 11.01；食品名称 食糖；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-022",
    "rowNumber": 22,
    "foodCategoryCode": "11.03.01",
    "foodCategoryName": "蜂蜜",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 11.03.01；食品名称 蜂蜜；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-023",
    "rowNumber": 23,
    "foodCategoryCode": "12.01",
    "foodCategoryName": "盐及代盐制品",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 12.01；食品名称 盐及代盐制品；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-024",
    "rowNumber": 24,
    "foodCategoryCode": "13.01",
    "foodCategoryName": "婴幼儿配方食品",
    "footnoteMarker": "a",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 13.01；食品名称 婴幼儿配方食品；不得添加食品用香料、香精；脚注 a：较大婴儿和幼儿配方食品中可以使用香兰素、乙基香兰素和香荚兰豆浸膏(提取物),最大使用量分别为5 mg/100 mL、5 mg/100 mL和按照生产需要适量使用,其中100 mL以即食食品计,生产企业应按照冲调比例折算成配方食品中的使用量;婴幼儿谷类辅助食品中可以使用香兰素,最大使用量为7 mg/100g,其中100g以即食食品计,生产企业应按照冲调比例折算成谷类食品中的使用量;凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-025",
    "rowNumber": 25,
    "foodCategoryCode": "13.02",
    "foodCategoryName": "婴幼儿辅助食品",
    "footnoteMarker": "a",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 13.02；食品名称 婴幼儿辅助食品；不得添加食品用香料、香精；脚注 a：较大婴儿和幼儿配方食品中可以使用香兰素、乙基香兰素和香荚兰豆浸膏(提取物),最大使用量分别为5 mg/100 mL、5 mg/100 mL和按照生产需要适量使用,其中100 mL以即食食品计,生产企业应按照冲调比例折算成配方食品中的使用量;婴幼儿谷类辅助食品中可以使用香兰素,最大使用量为7 mg/100g,其中100g以即食食品计,生产企业应按照冲调比例折算成谷类食品中的使用量;凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-026",
    "rowNumber": 26,
    "foodCategoryCode": "14.01.01",
    "foodCategoryName": "饮用天然矿泉水",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 14.01.01；食品名称 饮用天然矿泉水；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-027",
    "rowNumber": 27,
    "foodCategoryCode": "14.01.02",
    "foodCategoryName": "饮用纯净水",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 14.01.02；食品名称 饮用纯净水；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-028",
    "rowNumber": 28,
    "foodCategoryCode": "14.01.03",
    "foodCategoryName": "其他类饮用水",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 14.01.03；食品名称 其他类饮用水；不得添加食品用香料、香精。"
  },
  {
    "id": "gb2760-2024-b1-no-flavor-029",
    "rowNumber": 29,
    "foodCategoryCode": "16.02.01",
    "foodCategoryName": "茶叶、咖啡",
    "footnoteMarker": "",
    "pdfPage": 152,
    "standardPage": 149,
    "rawSourceText": "GB 2760-2024 表 B.1：食品分类号 16.02.01；食品名称 茶叶、咖啡；不得添加食品用香料、香精。"
  }
];

export const gb2760OfficialB1Footnotes = {
  "a": {
    "text": "较大婴儿和幼儿配方食品中可以使用香兰素、乙基香兰素和香荚兰豆浸膏(提取物),最大使用量分别为5 mg/100 mL、5 mg/100 mL和按照生产需要适量使用,其中100 mL以即食食品计,生产企业应按照冲调比例折算成配方食品中的使用量;婴幼儿谷类辅助食品中可以使用香兰素,最大使用量为7 mg/100g,其中100g以即食食品计,生产企业应按照冲调比例折算成谷类食品中的使用量;凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料。",
    "exceptionUses": [
      {
        "foodCategoryCode": "13.01.02",
        "foodCategoryName": "较大婴儿和幼儿配方食品",
        "flavorName": "香兰素",
        "maxUseLevel": "5 mg/100 mL",
        "useBasis": "100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量"
      },
      {
        "foodCategoryCode": "13.01.02",
        "foodCategoryName": "较大婴儿和幼儿配方食品",
        "flavorName": "乙基香兰素",
        "maxUseLevel": "5 mg/100 mL",
        "useBasis": "100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量"
      },
      {
        "foodCategoryCode": "13.01.02",
        "foodCategoryName": "较大婴儿和幼儿配方食品",
        "flavorName": "香荚兰豆浸膏(提取物)",
        "maxUseLevel": "按生产需要适量使用",
        "useBasis": "100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量"
      },
      {
        "foodCategoryCode": "13.02.01",
        "foodCategoryName": "婴幼儿谷类辅助食品",
        "flavorName": "香兰素",
        "maxUseLevel": "7 mg/100g",
        "useBasis": "100g以即食食品计，生产企业应按照冲调比例折算成谷类食品中的使用量"
      }
    ],
    "residualRestriction": "凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料"
  }
};

const gb2760OfficialA2ReferenceRows = gb2760OfficialA2ExceptionFoodCategories.map((row) => ({
  ...gb2760OfficialReferenceTableSource,
  id: row.id,
  tableName: '表 A.2',
  tableTitle: "表 A.1 中例外食品编号对应的食品类别",
  rowNumber: row.exceptionNumber,
  rowCode: String(row.exceptionNumber),
  rowName: row.foodCategoryName,
  rowData: {
    exceptionNumber: row.exceptionNumber,
    foodCategoryCode: row.foodCategoryCode,
    foodCategoryName: row.foodCategoryName
  },
  pdfPage: row.pdfPage,
  standardPage: row.standardPage,
  rawSourceText: row.rawSourceText,
  extractionStatus: 'extracted',
  reviewStatus: 'needs_review'
}));

const gb2760OfficialB1ReferenceRows = gb2760OfficialB1NoFlavorFoodCategories.map((row) => {
  const footnote = row.footnoteMarker ? gb2760OfficialB1Footnotes[row.footnoteMarker] : undefined;
  return {
    ...gb2760OfficialReferenceTableSource,
    id: row.id,
    tableName: '表 B.1',
    tableTitle: "不得添加食品用香料、香精的食品名单",
    rowNumber: row.rowNumber,
    rowCode: row.foodCategoryCode,
    rowName: row.foodCategoryName,
    rowData: {
      foodCategoryCode: row.foodCategoryCode,
      foodCategoryName: row.foodCategoryName,
      flavorUseRestriction: footnote ? 'no_added_food_flavor_with_footnote_exceptions' : 'no_added_food_flavor',
      footnoteMarker: row.footnoteMarker,
      ...(footnote ? { footnote } : {})
    },
    pdfPage: row.pdfPage,
    standardPage: row.standardPage,
    rawSourceText: row.rawSourceText,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  };
});

export const gb2760OfficialReferenceRows = [
  ...gb2760OfficialA2ReferenceRows,
  ...gb2760OfficialB1ReferenceRows
];

export function getGb2760OfficialReferenceTableSummary() {
  return {
    totalRows: gb2760OfficialReferenceRows.length,
    a2ExceptionFoodCategoryCount: gb2760OfficialA2ExceptionFoodCategories.length,
    b1NoFlavorFoodCategoryCount: gb2760OfficialB1NoFlavorFoodCategories.length,
    tableNames: [...new Set(gb2760OfficialReferenceRows.map((row) => row.tableName))],
    pdfPages: [...new Set(gb2760OfficialReferenceRows.map((row) => row.pdfPage))].sort((a, b) => a - b)
  };
}
