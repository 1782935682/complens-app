# AI Review - First Launch Onboarding

## 任务目标

新增首次启动引导闭环，让新用户在进入主流程前可以设置默认类别、过敏原、本机搜索历史偏好，并确认当前数据和结果使用边界。

## 修改摘要

- 新增 `/onboarding` 路由和 `src/pages/onboardingPage.js`。
- 首页在引导未完成时展示首次设置入口。
- 无 hash 首次进入时导向 `#/food/onboarding`。
- 新增 `compcheck:onboarding` 本机状态，支持完成、跳过和重置。
- 引导完成时同步写入默认类别、过敏原和搜索历史记录偏好。
- 冷启动无 hash 时会优先进入已保存的默认类别；未完成引导时进入对应类别的首次设置页。
- 本机数据快照导出/导入包含 onboarding 偏好；清空本机数据会重置引导状态。
- 更新移动端样式和 PWA app shell 缓存清单，缓存版本升到 `compcheck-shell-v5`。
- 补充路由、渲染、状态存储和 service worker 缓存清单测试。
- 同步更新 `COMMANDS.md` 和 `PROJECT_PLAN.md`。

## 修改文件

- `src/pages/onboardingPage.js`
- `src/store/userStore.js`
- `src/router/router.js`
- `src/pages/homePage.js`
- `src/main.js`
- `src/styles.css`
- `src/sw.js`
- `scripts/test.mjs`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

## 验证命令

```bash
npm run test
npm run validate:data
npm run lint
npm run build
git diff --check
```

## 验证结果

- `npm run test`：通过。
- `npm run validate:data`：通过。
- `npm run lint`：通过。
- `npm run build`：通过。
- `git diff --check`：通过。
- `curl -I http://127.0.0.1:5173/`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/main.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/pages/onboardingPage.js`：通过，返回 `HTTP/1.1 200 OK`。
- `curl -I http://127.0.0.1:5173/sw.js`：通过，返回 `HTTP/1.1 200 OK`。

## 风险点

- 当前引导仍是 Web/PWA 层能力，不等同于 iOS/Android 原生 onboarding。
- 引导页尚未接入真实相机权限说明和订阅权益说明。
- 完成或跳过引导只保存在本机；跨设备同步需要后端账号系统。
- PR #32 冷启动默认类别问题已修复，但仍需要浏览器真机验证无 hash 入口体验。

## 本次 git diff 摘要

- 新增首次启动引导用户流程。
- 将 onboarding 偏好纳入本机数据快照。
- 修复无 hash 冷启动不读取默认类别的问题。
- 更新 PWA 预缓存与测试覆盖。
