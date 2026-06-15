# AI Review — 2026-06-15 Batch PLATFORM-C

## 本轮目标

补齐 `PLATFORM-C`：统一旧原型跨端本地存储口径，确保图片/设置/报告三类本机数据都通过适配层读取，避免散点 `localStorage` 访问，同时完善隐私清理闭环（清空本机数据时可清理图片缓存）。

## 已检查文件

- `src/services/storageService.js`
- `src/services/imageStoreService.js`
- `src/services/ingredientApiService.js`
- `src/store/userStore.js`
- `src/main.js`
- `CODEX_TASKS.md`
- `PROJECT_PLAN.md`

## 已完成修改

1. `src/services/storageService.js`
   - 扩展 `getStorage()`：优先检测微信环境同步存储接口（`wx.getStorageSync` / `wx.setStorageSync` / `wx.removeStorageSync`），再回退 `window.localStorage`。
   - 保持现有内存降级与 cloud sync 流程。
2. `src/services/imageStoreService.js`
   - 新增 `clearAllImages()`，用于枚举并清理本机图片记录。
3. `src/services/ingredientApiService.js`
   - 统一通过 `storageService` 的 `readRaw()` 获取 `compcheck:api-base-url`，移除直接 `window.localStorage` 读取。
4. `src/store/userStore.js`
   - `clearLocalUserData()` 改为 `async`，追加调用 `clearAllImages()`，形成“本机数据清空”闭环。
5. `src/main.js`
   - PWA 标志位读取/写入改为 `storageService` 的 `readRaw` / `writeRaw`（保留页面行为不变）。

## 验证

- `npm run lint`
- `npm run test`
- `git diff --check`
