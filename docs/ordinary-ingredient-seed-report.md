# 普通食品原料基础库导入报告

生成时间：2026-06-18T12:51:04.099Z

## 汇总

| 指标 | 数量 |
|---|---:|
| source_id | ordinary-ingredient-seed-s2-v1 |
| source_tier | S2 |
| review_status | pending_review |
| 种子词条数 | 479 |
| 当前 S2 种子管理 ordinary_ingredient | 479 |
| 当前 ordinary_ingredient 总数 | 480 |
| 本次幂等执行新增 ingredient | 0 |
| 本次幂等执行更新 ingredient | 479 |
| alias upsert | 507 |
| source relation upsert | 479 |
| seed SHA-256 | b23e275230995d77945d465c8489da091bda620d1035b4450a0dc66f46d7dbc9 |

## 类别覆盖

| 类别 | 词条数 |
|---|---:|
| 乳及乳制品 | 36 |
| 坚果/籽类 | 46 |
| 果蔬/汁浆 | 35 |
| 水产及藻类 | 45 |
| 油脂 | 28 |
| 淀粉/粉体/膳食纤维 | 26 |
| 糖类/甜味原料 | 31 |
| 肉禽及制品 | 30 |
| 蛋类及蛋制品 | 15 |
| 调味料/发酵调味 | 41 |
| 谷物/杂粮/粉类 | 54 |
| 豆类及豆制品 | 40 |
| 香辛料/草本 | 52 |

## 数据边界

- 本轮普通配料为人工整理的 OCR 高频基础词，来源等级为 S2，`source_status=pending_review`。
- 未把普通配料伪装为 S0 官方标准数据，也未生成法规结论。
- 该基础库用于后续 OCR 候选匹配和人工复核，不进入 verified 查询结论。
