# AI Review - 2026-06-12 Q-A 前端登录/注册页面

## 本轮目标

按 `CODEX_TASKS.md` 当前最早可执行的 Codex 批次推进：

- Batch Q-A：前端登录/注册页面

本批次不处理等待人工确认的官方数据导入、生产数据库、真实 OCR Key、真实 AI Key、生产 CDN 图片存储、商店账号、支付和法务材料。

## 本轮完成

1. 新增 `src/pages/authPage.js`，支持登录/注册同页切换、邮箱、8 位以上密码、显示/隐藏密码、访客模式继续和来源页回跳。
2. 新增 `src/services/authService.js`，接入 `/api/auth/login`、`/api/auth/register`、`/api/auth/logout`，统一管理 `compcheck:auth-token` 和 `compcheck:auth-user`。
3. 前端会解析 JWT payload `exp`；token 无效或过期时清理 token/user，并在浏览器环境回到 `#/login`。
4. 登录/注册成功前先抓取访客本机数据快照；保存 token 后调用 `syncLocalDataToServer()`，把收藏、历史、过敏原、报告和产品档案写入当前 token 的隔离存储，再由 `storageService` 按既有 hydration + pending write 逻辑后台同步，避免直接覆盖服务端数据。
5. `src/store/userStore.js` 新增 `currentUser` 状态，`authService.getCurrentUser()` 以当前 token + 本地用户缓存为准刷新该状态。
6. 设置页“会员与同步”区块改为“账号与云同步”：未登录显示“登录账号，开启云同步”，已登录显示邮箱和“退出登录”。
7. 路由新增 `auth` view，支持 `#/login` 和 `#/food/login`，并把登录页归到设置导航 active 态。
8. 主入口绑定登录/注册提交、错误提示、密码显示切换和退出登录；错误文案覆盖无效邮箱、短密码、邮箱已注册、密码错误、服务器异常和网络失败。
9. PWA cache 更新到 `compcheck-shell-v20`，避免旧 shell 继续加载旧登录入口。
10. `scripts/test.mjs` 补充登录路由、登录/注册页渲染、输入校验、JWT 过期清理、退出登录、本机数据登录态同步、设置页登录入口和 service worker 版本断言。
11. `CODEX_TASKS.md` 和 `PROJECT_PLAN.md` 已同步：Q-A 标记完成，下一批 Codex 任务为 U-A 个性化关注项，整体产品进度更新为 43%。

## 人工接入点

本轮 Q-A 没有新增必须人工接入的编码阻塞。

| 阻塞项 | 状态 | 需要用户提供 |
|---|---|---|
| 真实跨设备同步验收 | needs_manual_or_env | 至少两个登录设备或浏览器环境，验证收藏、历史、过敏原、报告和产品档案元数据恢复 |
| 本地数据库迁移环境 | inherited_blocked_by_environment | F-A 已发现当前 Docker `postgres-data` volume 的 `postgres` 密码与 `backend/.env` 的 `postgres:password` 不一致；若后续要本机跑迁移，需要人工决定是否重建本地 volume 或提供正确 `DATABASE_URL` |
| Data Batch 1-B 官方来源导入 | blocked_by_user | 官方来源清单、10-20 条逐条审核样例、可升级为 reviewed/verified 的条目 |
| OCR API Key | blocked_by_user | 选定 OCR 供应商、服务端 API Key、额度和错误策略 |
| AI API Key | blocked_by_user | 选定 AI 供应商、服务端 API Key、成本上限和提示边界 |
| 生产 DATABASE_URL | blocked_by_user | 生产 PostgreSQL 平台、连接串、备份和发布策略 |
| 生产图片/CDN 存储 | blocked_by_user | 对象存储/CDN 方案、上传 API、安全策略和缩略图 URL 策略 |

## 验证结果

```bash
npm run validate:data
npm run lint
npm run test
npm run build
cd backend && npm run typecheck
cd backend && npm test
git diff --check
```

全部通过。

本轮未修改后端代码或数据库 schema，因此未重新运行数据库迁移/seed。

## 当前风险

1. 登录后同步目前依赖 `storageService` 的后台 hydration + pending write 合并逻辑；已覆盖结构测试，但仍缺真实多设备验收。
2. 账号体系仍缺 refresh token、匿名用户升级、第三方登录、账号隐私导出和云端账号删除入口的前端流程。
3. 完整图片仍只保存在本机 IndexedDB，跨设备同步在生产图片/CDN 存储接入前只能恢复元数据、`imageId` 和缩略图。
4. 100 条食品添加剂 seed 仍全部是 `confidenceLevel: "unverified"`、`isVerified: false`，不能视为已审核结论。
5. 真实 OCR 尚未接入；当前图片链路能保留图片和手动/确认文本，但不能视为真实自动识别完成。

## 下一步

当前最早可继续执行的 Codex 任务：`Batch U-A：关注成分、忌口项、过敏原与全局高亮`。
