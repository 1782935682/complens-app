# AI Review - 2026-06-12 U-A 个性化关注项

## 本轮目标

按 `CODEX_TASKS.md` 当前最早可执行的 Codex 批次推进：

- Batch U-A：关注成分、忌口项、过敏原与全局高亮

本批次不处理等待人工确认的官方数据导入、生产数据库、真实 OCR Key、真实 AI Key、生产 CDN 图片存储、商店账号、支付和法务材料。

## 本轮完成

1. 新增 `src/services/personalProfileService.js`，统一读取和归一化三类个人档案：`compcheck:allergens`、`compcheck:watch-ingredients`、`compcheck:avoid-ingredients`。
2. 个人命中优先级固定为：过敏原 > 忌口项 > 关注成分；同一成分只展示最高优先级 badge。
3. 设置页改为“个人成分档案”，包含过敏原、我的关注成分、我的忌口项三个可展开区块。
4. 关注成分和忌口项支持当前类别内搜索、点击添加、已选 chip 删除，并保留谨慎文案：关注不代表有害，忌口提醒不构成医疗建议。
5. 本机数据面板新增关注成分和忌口项计数；本机 JSON 导出、导入、清空均覆盖新档案 key。
6. 搜索结果、详情页和报告详情接入统一个人命中 badge/banner。
7. 报告详情在关注摘要后新增“个人命中摘要”，并在已匹配成分条目中显示个人 badge。
8. 首次引导的过敏原步骤补充说明：以后可以在设置中修改，并补充关注成分和忌口项。
9. PWA cache 更新到 `compcheck-shell-v21`，避免旧 shell 继续加载旧设置页和报告页。
10. `scripts/test.mjs` 补充关注/忌口增删、`getPersonalProfile()`、报告个人命中、搜索/详情高亮、清空后高亮消失、本机快照导入/导出/清空和 service worker 版本断言。
11. `CODEX_TASKS.md` 和 `PROJECT_PLAN.md` 已同步：U-A 标记完成，下一批 Codex 任务为 M-A，整体产品进度更新为 44%。
12. `.gitignore` 忽略 `codex-auto-*.prompt` 本地生成提示文件，避免误提交自动化 prompt。

## 人工接入点

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| 关注/忌口跨设备同步 | needs_backend_batch | 当前关注成分和忌口项已纳入本机快照，但后端还没有 profile 同步接口；需要新增后端 schema/API 后才能跨设备恢复 |
| 真实跨设备同步验收 | needs_manual_or_env | 至少两个登录设备或浏览器环境，验证收藏、历史、过敏原、报告和产品档案元数据恢复；关注/忌口需等后端接口补齐后再验收 |
| 本地数据库迁移环境 | inherited_blocked_by_environment | F-A 已发现当前 Docker `postgres-data` volume 的 `postgres` 密码与 `backend/.env` 的 `postgres:password` 不一致；若后续要本机跑迁移，需要人工决定是否重建本地 volume 或提供正确 `DATABASE_URL` |
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商、服务端 API Key、额度和错误策略 |
| AI API Key | blocked_by_user | 选定 AI 供应商、服务端 API Key、成本上限和提示边界 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |
| 生产图片/CDN 存储 | blocked_by_user | 对象存储/CDN 方案、上传 API、安全策略和缩略图 URL 策略 |

## 验证结果

```bash
npm run validate:data
npm run test
npm run lint
npm run build
git diff --check
codex review --uncommitted
```

全部通过。本地 Codex review 首轮发现关注/忌口账号隔离、进度文档不一致和生成 prompt 文件风险，均已修复并复跑通过。

本轮未修改后端代码或数据库 schema，因此未重新运行数据库迁移/seed。

## 当前风险

1. 关注成分和忌口项当前是本机档案，支持导入/导出/清空；跨设备同步需要后端 profile 同步接口。
2. 过敏原同步仍沿用 `/api/user/allergens`，但真实多设备验收尚未完成。
3. 100 条食品添加剂 seed 仍全部是 `confidenceLevel: "unverified"`、`isVerified: false`，不能视为已审核结论。
4. 真实 OCR 尚未接入；当前图片链路能保留图片和手动/确认文本，但不能视为真实自动识别完成。
5. UI 已补基础响应式样式，但仍缺浏览器 E2E 和真机视觉验收。

## 下一步

当前最早可继续执行的 Codex 任务：`Batch M-A：首页与导航重构 + 设计系统落地`。
