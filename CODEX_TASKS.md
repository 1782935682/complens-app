# CODEX_TASKS

当前任务模式：`PLAN -> IMPLEMENT -> TEST -> EVALUATE -> REVIEW -> FIX -> LOOP`。

## 已完成

- 建立多 Agent 决策服务。
- 新增 `POST /api/decision/analyze`。
- 新增 `POST /api/decision/compare`。
- 首页收敛为单入口 `拍照识别`。
- 结果页收敛为三卡：该不该买、风险原因、替代推荐。
- 删除旧 Vite/PWA/Capacitor 原型代码和旧搜索页。
- 建立 `npm run eval:all`。
- 建立 `.codex/state/checkpoint.json` 断点续跑。
- 小程序端 A/B 对比流程接入后端对比适配器。
- 扩展 `evaluation_case` 样本，覆盖控糖、减脂、儿童、过敏、乳糖不耐。
- 结果页和对比页改为图文结合的决策可视化卡片。
- 删除首页 tabBar 入口，首页只保留 `拍照识别`。
- 新增 `review-agent` 独立评审系统。
- `npm run eval:all` 新增 `stability_score`、`regression_detection`、`decision_quality_score`、`ui_clarity_score`。
- checkpoint 新增 `iteration_id`、`ui_state`、`decision_quality`、`failed_cases`、`next_actions`。
- 结果页新增收藏建议 / 加入避雷轻动作。

## 下一步

1. 继续 UI-first 决策可视化，减少密集文字和重复说明。
2. 在不削弱决策质量的前提下修复剩余阻断级 OCR 样本。
3. 扩展更多真实包装样本，防止决策样本过拟合。

当前进度以 `.codex/state/checkpoint.json` 为准。
