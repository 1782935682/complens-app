# 成分镜真实网络包装样本 OCR 回归

生成时间：2026-06-27T02:00:44.802Z

OCR 服务：http://127.0.0.1:8000

图片策略：Network images are downloaded to /tmp for smoke testing only; image binaries are not stored in the repo.

## 总览

- 样本数：11
- 可生成报告：6
- 需要补拍/手动补充：5
- OCR 失败但不中断：0
- 需要修复：0
- 高优先级问题：0
- 中优先级问题：1

sample | role | state | ocr | extraction | ocrProduct | ingredient | nutrition | productionDate | decision | issues
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
vita-ingredients | 配料表 | report_ready | 0.97 | high | - | yes | no | - | insufficient | -
vita-nutrition | 营养成分表 | manual_or_retake | 0.98 | low | - | no | yes | - | insufficient | medium:nutrition_too_sparse
soy-ingredients | 调味品配料表 | report_ready | 0.92 | high | - | yes | no | - | insufficient | -
curry-ingredients | 长配料表 | report_ready | 0.97 | high | - | yes | no | - | insufficient | -
curry-nutrition | 营养成分表 | report_ready | 0.97 | low | - | no | yes | - | insufficient | -
yogurt-front-claim | 酸奶包装正面声明 | manual_or_retake | 0.92 | low | - | no | no | - | insufficient | -
yogurt-ingredients | 酸奶配料表 | report_ready | 0.97 | high | - | yes | no | - | insufficient | -
yogurt-nutrition | 酸奶营养成分表 | report_ready | 0.94 | low | - | no | yes | - | insufficient | -
gmw-back-label | 背标局部 | manual_or_retake | 0.94 | low | - | no | no | 见包装 | insufficient | -
gmw-date-code | 只有喷码日期 | manual_or_retake | 0.96 | low | - | no | no | - | insufficient | -
gmw-front-date | 正面包装日期 | manual_or_retake | 0.86 | low | - | no | no | 2025/03/15 | insufficient | -

## 来源

- vita-ingredients: https://world.openfoodfacts.org/product/4891028706656 (https://images.openfoodfacts.org/images/products/489/102/870/6656/ingredients_zh.9.400.jpg)
- vita-nutrition: https://world.openfoodfacts.org/product/4891028706656 (https://images.openfoodfacts.org/images/products/489/102/870/6656/nutrition_zh.12.400.jpg)
- soy-ingredients: https://world.openfoodfacts.org/product/6902265210504 (https://images.openfoodfacts.org/images/products/690/226/521/0504/ingredients_zh.10.400.jpg)
- curry-ingredients: https://world.openfoodfacts.org/product/6936749501109 (https://images.openfoodfacts.org/images/products/693/674/950/1109/ingredients_zh.4.400.jpg)
- curry-nutrition: https://world.openfoodfacts.org/product/6936749501109 (https://images.openfoodfacts.org/images/products/693/674/950/1109/nutrition_zh.7.400.jpg)
- yogurt-front-claim: https://world.openfoodfacts.org/product/6922577790068 (https://images.openfoodfacts.org/images/products/692/257/779/0068/front_zh.3.400.jpg)
- yogurt-ingredients: https://world.openfoodfacts.org/product/6922577790068 (https://images.openfoodfacts.org/images/products/692/257/779/0068/ingredients_zh.5.400.jpg)
- yogurt-nutrition: https://world.openfoodfacts.org/product/6922577790068 (https://images.openfoodfacts.org/images/products/692/257/779/0068/nutrition_zh.7.400.jpg)
- gmw-back-label: https://m.gmw.cn/2025-04/14/content_1304015064.htm (https://imgm.gmw.cn/attachement/jpg/site215/20250414/7326432166791366016.jpg)
- gmw-date-code: https://m.gmw.cn/2025-04/14/content_1304015064.htm (https://imgm.gmw.cn/attachement/jpg/site215/20250414/2228264118440736172.jpg)
- gmw-front-date: https://m.gmw.cn/2025-04/14/content_1304015064.htm (https://imgm.gmw.cn/attachement/jpg/site215/20250414/1878967348235225011.jpg)

## vita-ingredients

- 角色：配料表
- 状态：report_ready
- 商品名：OCR=-；manifest=维他柠檬味茶饮料；报告=未命名食品
- OCR 文本：

```text
配料:水,白砂糖,红茶,红茶粉,
浓缩柠檬汁,食品添加剂(酸度调节
剂(330,331),抗氧化剂(300),
食用香精。
柠檬汁添加量≥2.8g/L
茶多酚含量≥300mg
```

- 提取：配料=水,白砂糖,红茶,红茶粉, 浓缩柠檬汁,食品添加剂(酸度调节 剂(330,331),抗氧化剂(300), 食用香精。；营养=-；生产日期=-；未确认=柠檬汁添加量≥2.8g/L / 茶多酚含量≥300mg
- 报告：信息不足，请补拍营养成分表数字、过敏原提示，或手动补充对应文字。

## vita-nutrition

- 角色：营养成分表
- 状态：manual_or_retake
- 商品名：OCR=-；manifest=维他柠檬味茶饮料；报告=未命名食品
- OCR 文本：

```text
每100毫升 营养素参考值装
项目
能量
221kJ
蛋白质
脂肪
碳水化合物
10mg
钠
```

- 提取：配料=-；营养=每100毫升 营养素参考值装 项目 能量 221kJ 蛋白质 脂肪 碳水化合物 10mg 钠；生产日期=-；未确认=-
- 报告：信息不足，请补拍配料表、营养成分表数字、过敏原提示，或手动补充对应文字。

## soy-ingredients

- 角色：调味品配料表
- 状态：report_ready
- 商品名：OCR=-；manifest=海天草菇老抽；报告=未命名食品
- OCR 文本：

```text
护料
表:水,
非转基因黄豆,食用
焦糖色,
,小麦,白砂糖,谷氨酸
草菇。
```

- 提取：配料=水, 非转基因黄豆,焦糖色, 小麦,白砂糖,谷氨酸 草菇。；营养=-；生产日期=-；未确认=护料
- 报告：信息不足，请补拍营养成分表数字、过敏原提示，或手动补充对应文字。

## curry-ingredients

- 角色：长配料表
- 状态：report_ready
- 商品名：OCR=-；manifest=好侍百梦多咖喱；报告=未命名食品
- OCR 文本：

```text
配料:食用油脂制品(精炼植物油(棕榈油、氢化菜籽油、维
生素E)、磷脂)、小麦粉、白砂糖、食用盐、麦芽糊精、姜
黄粉、香辛料、咖喱粉、味精、食品添加剂(5-肌苷酸二
钠、磷脂、柠檬酸、单硬脂酸甘油酯)、椰子粉、脱脂乳
粉、番茄粉、食用葡萄糖、蜂蜜、水、复合调味粉(酸水解
植物蛋白调味粉(食用大豆粕、食用玉米蛋白、啤酒酵母
粉、5一呈味核苷酸二钠)、味精、食用盐、白砂糖、L一丙
氨酸、麦芽糊精、5一呈味核苷酸二钠、酵母抽提物、甘氨
酸)、浓缩苹果浆、食用香精
```

- 提取：配料=食用油脂制品(精炼植物油(棕榈油、氢化菜籽油、维 生素E)、磷脂)、小麦粉、白砂糖、食用盐、麦芽糊精、姜黄粉、香辛料、咖喱粉、味精、食品添加剂(5'-肌苷酸二钠、磷脂、柠檬酸、单硬脂酸甘油酯)、椰子粉、脱脂乳粉、番茄粉、食用葡萄糖、蜂蜜、水...；营养=-；生产日期=-；未确认=-
- 报告：信息不足，请补拍营养成分表数字、过敏原提示，或手动补充对应文字。

## curry-nutrition

- 角色：营养成分表
- 状态：report_ready
- 商品名：OCR=-；manifest=好侍百梦多咖喱；报告=未命名食品
- OCR 文本：

```text
营养成分表
每100g
NRV%
2264kJ
27%
蛋白质
5.2g
9%
脂肪
39.1g
65%
-反式脂肪酸
0.4g
碳水化合物
42.2g
14%
钠
4070mg
204%
```

- 提取：配料=-；营养=营养成分表 每100g NRV% 2264kJ 27% 蛋白质 5.2g 9% 脂肪 39.1g 65% -反式脂肪酸 0.4g 碳水化合物 42.2g 14% 钠 4070mg 204%；生产日期=-；未确认=-
- 报告：信息不足，请补拍配料表、过敏原提示，或手动补充对应文字。

## yogurt-front-claim

- 角色：酸奶包装正面声明
- 状态：manual_or_retake
- 商品名：OCR=-；manifest=君乐宝简醇；报告=未命名食品
- OCR 文本：

```text
君乐宝
简·醇
YOGURT
O蔗糖酸奶
减40%脂肪
低脂青柠
风味酸牛奶净含量:100克
国富汉供考
```

- 提取：配料=-；营养=-；生产日期=-；未确认=君乐宝 / 简·醇 / YOGURT / 风味酸牛奶净含量:100克
- 报告：信息不足，请补拍配料表、过敏原提示，或手动补充对应文字。

## yogurt-ingredients

- 角色：酸奶配料表
- 状态：report_ready
- 商品名：OCR=-；manifest=君乐宝简醇；报告=未命名食品
- OCR 文本：

```text
配料:生牛乳,青柠果味酱,聚葡萄糖,木糖
醇,浓缩牛奶蛋白,羟丙基二淀粉磷酸酯,明胶
(来源于牛骨),双乙酰酒石酸单双甘油酯,果
胶,黄原胶,碳酸氢钠,三氯蔗糖,睡液链球菌
嗜热亚种,德氏乳杆菌保加利亚亚种。
```

- 提取：配料=生牛乳,青柠果味酱,聚葡萄糖,木糖醇,浓缩牛奶蛋白,羟丙基二淀粉磷酸酯,明胶(来源于牛骨),双乙酰酒石酸单双甘油酯,果胶,黄原胶,碳酸氢钠,三氯蔗糖,睡液链球菌 嗜热亚种,德氏乳杆菌保加利亚亚种。；营养=-；生产日期=-；未确认=-
- 报告：信息不足，请补拍营养成分表数字、过敏原提示，或手动补充对应文字。

## yogurt-nutrition

- 角色：酸奶营养成分表
- 状态：report_ready
- 商品名：OCR=-；manifest=君乐宝简醇；报告=未命名食品
- OCR 文本：

```text
营养成分表
每100克
营养素参考值%
250千焦
3%
能量
5022350
蛋白质
3.0克
脂肪
1.4克
碳水化合物
9.3克
95毫克
1
90毫克
蔗糖含量:未检出(依据GB5009.8第一法)
乳酸菌活菌数≥1×10CFU/100克
营养声称以每100毫升计,本产品脂防≤1.5克/100毫升
青柠果味酱添加量≥15克/千克(青柠果味酱中浓缩青
柠浊汁≥5克/100克,折算青柠汁添加量≥40克/100克
```

- 提取：配料=-；营养=营养成分表 每100克 营养素参考值% 250千焦 3% 能量 5022350 蛋白质 3.0克 脂肪 1.4克 碳水化合物 9.3克 95毫克 1 90毫克 蔗糖含量:未检出(依据GB5009.8第一法) 乳酸菌活菌数≥1×10CFU/1...；生产日期=-；未确认=-
- 报告：信息不足，请补拍配料表、过敏原提示，或手动补充对应文字。

## gmw-back-label

- 角色：背标局部
- 状态：manual_or_retake
- 商品名：OCR=-；manifest=新闻样本食品背标；报告=未命名食品
- OCR 文本：

```text
食品名
、日砂糖、食用益、味
黑色鱼反
酿造酱油、食品添加剂
肤质的谷物及其
其制品,该生产设
制品、坚果及其果仁类制品、
品的产品。
净含量:40克
保质期:12个月 生产日期:见包装袋封口附近
食用方法:开封即食,开封后请尽快食用元卡。
购存条件:请置于阴凉干燥处密闭保存。
南宾吃象
南宁宝
```

- 提取：配料=-；营养=-；生产日期=见包装；未确认=食品名 / 黑色鱼反 / 净含量:40克 / 保质期:12个月 生产日期:见包装袋封口附近 / 食用方法:开封即食,开封后请尽快食用元卡。 / 南宾吃象 / 南宁宝
- 报告：信息不足，请补拍配料表、过敏原提示，或手动补充对应文字。

## gmw-date-code

- 角色：只有喷码日期
- 状态：manual_or_retake
- 商品名：OCR=-；manifest=新闻样本日期喷码；报告=未命名食品
- OCR 文本：

```text
20250226 D1321
南宁宝
```

- 提取：配料=-；营养=-；生产日期=-；未确认=20250226 D1321 / 南宁宝
- 报告：信息不足，请补拍配料表、过敏原提示，或手动补充对应文字。

## gmw-front-date

- 角色：正面包装日期
- 状态：manual_or_retake
- 商品名：OCR=-；manifest=新闻样本正面日期；报告=未命名食品
- OCR 文本：

```text
馄饨
1.8分
生产日期:2025/03/1510
保质期至·2025/11/14
刺宾味款
南宁宝
```

- 提取：配料=-；营养=-；生产日期=2025/03/15；未确认=馄饨 / 1.8分 / 生产日期:2025/03/1510 / 保质期至·2025/11/14 / 刺宾味款 / 南宁宝
- 报告：信息不足，请补拍配料表、过敏原提示，或手动补充对应文字。
