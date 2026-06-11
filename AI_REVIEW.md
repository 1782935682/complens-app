# AI Review - Data Correction Feedback

## 任务目标

新增数据纠错反馈闭环，让用户从食品详情页或数据来源页发现草稿数据、来源、限量或审核状态问题时，可以一键进入支持中心，并自动带入问题类型、标题和描述草稿，再保存为本机反馈记录。

## 修改摘要

- 支持中心路由新增 query 预填解析，支持 `topic`、`subject`、`message` 和 `contact`。
- 支持中心表单根据预填草稿自动选中问题类型并填入标题、描述和联系方式。
- 预填链接会保留 `bug-feedback` 默认支持类型，避免浏览器 fallback 到第一个选项。
- 食品详情页新增“反馈这条数据”入口，带入成分名称、ID、数据状态、GB / INS 编号和待核对项。
- 数据来源页新增“反馈数据问题”入口，带入当前记录数、来源覆盖、限量覆盖和缺口数量。
- 保存预填反馈后会清理 URL query，避免用户重复提交同一草稿。
- 支持服务新增预填草稿归一化和预填链接构建能力。
- 补充预填反馈移动端样式。
- PWA shell 缓存版本升到 `compcheck-shell-v11`。
- 补充路由、预填链接、支持中心渲染、详情页入口、数据页入口和 service worker 缓存版本测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/services/supportService.js`
- `src/pages/supportPage.js`
- `src/pages/detailPage.js`
- `src/pages/dataPage.js`
- `src/main.js`
- `src/router/router.js`
- `src/styles.css`
- `src/sw.js`
- `scripts/test.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run validate:data
npm run lint
npm run test
npm run build
git diff --check
```

## 验证结果

- `npm run validate:data` 通过，50 条食品添加剂记录校验成功。
- `npm run lint` 通过，44 个 JavaScript 文件和 50 个文本文件检查成功。
- `npm run test` 通过。
- `npm run build` 通过，构建产物输出到 `dist/`。
- `git diff --check` 通过。
- `curl -I http://127.0.0.1:5178/`、`/main.js`、`/pages/supportPage.js`、`/pages/detailPage.js`、`/pages/dataPage.js`、`/services/supportService.js` 和 `/sw.js` 均返回 HTTP 200。

## 风险点

- 当前反馈仍只保存在本机浏览器，不会自动上传到客服后台；正式上线前仍需接入工单系统、账号关联和 SLA。
- 预填草稿来自 URL query，已做长度限制和 HTML 转义，但保存前仍要求用户确认本机保存边界。
- 数据纠错入口只能收集反馈，不能代表数据已复核或已验证。
- 已修复 Codex 审阅指出的默认 `bug-feedback` topic 被预填链接省略后错选为订阅类型的问题。

## 本次 git diff 摘要

- 新增支持中心预填反馈模型和路由解析。
- 新增详情页、数据来源页到支持中心的数据纠错入口。
- 更新 PWA 预缓存版本与测试覆盖。
