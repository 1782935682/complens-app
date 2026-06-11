# Codex 开发任务清单

> **使用说明**：每次让 Codex 继续开发时，告诉它"按 CODEX_TASKS.md 中最早未完成的任务执行"。每个批次完成后将状态改为 `✅ 已完成 YYYY-MM-DD`。

---

## 任务执行规则

1. **按顺序执行**，不跳过、不合并跨阶段任务。
2. **每个批次对应一个 PR**，PR 合并后再开始下一批次。
3. 每个批次完成后必须同步更新 `PROJECT_PLAN.md` 的进度和修改记录。
4. `[人工]` 任务需要人工操作完成并在本文件中标注后，Codex 再继续。
5. `[Codex]` 任务由 Codex 独立完成并提交 PR。
6. `[人工+Codex]` 任务需人工先完成前置操作，Codex 再执行编码部分。
7. 每个 Codex 批次结束前必须全部通过：`npm run validate:data && npm run lint && npm run test && npm run build`（后端改为对应命令）。
8. 禁止为通过测试/构建而屏蔽错误、删除断言或使用 mock 假装功能完成。
9. 禁止自动 push 到 `main`，所有代码必须通过 PR 合并。

---

## 技术栈速查

| 层级 | 技术 | 说明 |
|---|---|---|
| 前端语言 | 纯 JS ES2022+ | 无 TypeScript，JSDoc 注释类型 |
| 前端框架 | 无 | 无 React/Vue/Svelte |
| 前端构建 | Vite（M2 引入后） | 引入前仍用 scripts/build.mjs |
| 前端路由 | 自实现 hash 路由 | window.location.hash |
| 移动端打包 | Capacitor | M2 引入 |
| 后端语言 | Node.js 20 + TypeScript | 位于仓库 `backend/` 子目录 |
| 后端框架 | Hono | 轻量级 |
| ORM | Drizzle ORM + PostgreSQL | |
| 前端测试 | Node.js 原生 assert | scripts/test.mjs |
| 后端测试 | Vitest | backend/tests/ |
| CI | GitHub Actions | .github/workflows/ |

---

## 阶段 0：前置修复（立即执行）

> 必须在所有其他批次之前完成。当前 `npm run test` 失败，阻断 CI 和后续开发。

### Batch 0-A：修复当前测试失败 `[Codex]`

**状态**：✅ 已完成 2026-06-11

**背景**：`scripts/test.mjs:492` 断言失败：
```js
assert.equal(riskSortedSweetenerHtml.indexOf('阿斯巴甜') < riskSortedSweetenerHtml.indexOf('三氯蔗糖'), true);
```
甜味剂按风险排序时，`阿斯巴甜` 应排在 `三氯蔗糖` 前（风险更高）。当前 `src/data/foodAdditives.js` 中两者的 `riskLevel` 赋值与测试预期不符。

**任务描述**：
1. 在 `src/data/foodAdditives.js` 中找到 `阿斯巴甜`（id: `aspartame`）和 `三氯蔗糖`（id: `sucralose`）
2. 修正：`阿斯巴甜` → `riskLevel: 'medium'`，`三氯蔗糖` → `riskLevel: 'low'`
   （依据：阿斯巴甜被 IARC 列为 2B 类致癌物，PKU 患者禁用；三氯蔗糖 ADI 内普遍认为安全）
3. 同时提交已 staged 的 `scripts/validate-data.mjs` 改动

**涉及文件**：
- `src/data/foodAdditives.js`
- `scripts/validate-data.mjs`（已 staged，一并提交）

**验收标准**：
```bash
npm run validate:data   # 显示 100 条记录
npm run lint            # 通过
npm run test            # 全部通过，无 AssertionError
npm run build           # 通过
```

---

## 阶段 1：M1 收尾 —— Web/PWA MVP 完成

### Batch 1-A：食品数据扩充确认 `[自动完成]`

**状态**：✅ 已完成 2026-06-11（数据已达 100 条，validate:data 通过，Batch 0-A 修复测试后本批次即完成）

---

### Batch 1-B：前端已知缺口修复 `[Codex]`

**状态**：⏳ 待开始（依赖 Batch 0-A 完成）

**任务描述**（全部在一个 PR 内完成）：

1. **扫描页 OCR 协议状态文案优化** — `src/pages/scanPage.js`
   - 当前：页面展示占位 endpoint URL 给用户
   - 改为：显示"OCR 服务未接入，请手动输入文字"
   - 占位 endpoint 仍保留在 `src/services/ocrService.js` 中，不删除

2. **分析页空输入防御** — `src/pages/analyzePage.js`
   - 输入框为空时点击分析按钮：显示提示"请先输入成分表文字"，不触发分析逻辑

3. **详情页无数据容错** — `src/pages/detailPage.js`
   - `ingredientService.findById()` 返回 `null` 时，渲染友好提示页：
     "该成分暂未收录" + 返回搜索链接 + 数据纠错反馈入口（复用 supportService 预填草稿）

4. **收藏页空状态强化** — `src/pages/favoritesPage.js`
   - 收藏列表为空时显示："暂无收藏，去搜索成分并收藏"
   - 附跳转当前类别搜索页的按钮

5. **搜索页无结果时展示热门分类入口** — `src/pages/searchPage.js`
   - 无结果时，在"未找到相关成分"提示下方展示 2–3 个热门分类入口
   - 取 `ingredientService.getCategoryStats()` 数量最多的前 3 个分类

**涉及文件**：
- `src/pages/scanPage.js`
- `src/pages/analyzePage.js`
- `src/pages/detailPage.js`
- `src/pages/favoritesPage.js`
- `src/pages/searchPage.js`
- `scripts/test.mjs`（每个场景新增至少 1 个断言）

**验收标准**：
```bash
npm run validate:data && npm run lint && npm run test && npm run build
# 5 个新场景均有测试覆盖
```

---

## 阶段 2：M2 移动端基座

### 前置人工操作（解锁 Vite 约束） `[人工]`

**状态**：⏳ 待完成 — **必须在 Batch 2-A 之前完成**

- [ ] 修改 `readme.md` 第 21 节：
  - 21.1 表格"打包工具"行改为：`Vite`（M2 起引入）
  - 21.2 禁止引入列表删除"任何打包工具（Vite、webpack…）"，改为"webpack、Parcel（Vite 内置 Rollup 除外）"
- [ ] 同步修改 `scripts/ai-review.py` 和 `.github/workflows/claude-review.yml` 中对 Vite 的禁止约束说明（搜索"Vite"关键字删除或调整）
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 2-A：前端工程化迁移（Vite） `[Codex]`

**状态**：⏳ 待开始（依赖前置人工操作完成）

**任务描述**：

1. 安装依赖：`npm install --save-dev vite`

2. 新建 `vite.config.js`（纯 JS，不用 TypeScript）：
   ```js
   import { defineConfig } from 'vite';
   export default defineConfig({
     root: 'src',
     publicDir: '../public',
     build: { outDir: '../dist', emptyOutDir: true },
     server: { port: 5173, open: false },
   });
   ```

3. 环境变量策略（与现有 `.env.example` 保持一致，**不使用 `VITE_` 前缀**）：
   - 公开配置通过 `define` 注入：
     ```js
     define: { '__APP_NAME__': JSON.stringify(process.env.APP_NAME || '成分小查') }
     ```
   - 服务端密钥不通过 Vite 注入前端

4. 更新 `package.json` scripts：
   ```json
   "dev":           "vite",
   "build":         "vite build",
   "preview":       "vite preview",
   "lint":          "node scripts/lint.mjs",
   "test":          "node scripts/test.mjs",
   "validate:data": "node scripts/validate-data.mjs"
   ```

5. 同步更新 `COMMANDS.md`，将 dev/build 说明改为 Vite 命令

**涉及文件**：
- `vite.config.js`（新建）
- `package.json`（修改 scripts）
- `COMMANDS.md`

**验收标准**：
```bash
npm run dev            # Vite dev server 启动
curl -I http://127.0.0.1:5173/   # 200
npm run build          # dist/ 生成，包含压缩 JS/CSS
npm run test           # 全部通过
npm run lint           # 通过
```

---

### Batch 2-B：Capacitor 项目脚手架 `[Codex]`

**状态**：⏳ 待开始（依赖 2-A 完成）

**任务描述**：

1. 安装 Capacitor：
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
   ```

2. 新建 `capacitor.config.json`：
   ```json
   {
     "appId": "com.compcheck.app",
     "appName": "成分小查",
     "webDir": "dist",
     "server": { "androidScheme": "https" }
   }
   ```

3. 初始化平台（先 build，再 add）：
   ```bash
   npm run build
   npx cap add ios
   npx cap add android
   ```

4. 更新 `package.json` scripts：
   ```json
   "cap:sync":         "npm run build && npx cap sync",
   "cap:open:ios":     "npx cap open ios",
   "cap:open:android": "npx cap open android"
   ```

5. 根目录 `.gitignore` 追加：
   ```
   # Capacitor 平台目录（仅保留 capacitor.config.json）
   /ios/
   /android/
   ```

6. 更新 `COMMANDS.md` 补充移动端构建命令

**涉及文件**：
- `capacitor.config.json`（新建）
- `package.json`
- `.gitignore`
- `COMMANDS.md`

**验收标准**：
```bash
npm run build && npx cap sync   # 不报错
npx cap doctor                  # config 无报错（允许 native IDE 未安装提示）
npm run lint && npm run test
```

---

### Batch 2-C：原生权限与移动端适配 `[Codex]`

**状态**：⏳ 待开始（依赖 2-B 完成）

**任务描述**：

1. 安装插件：
   ```bash
   npm install @capacitor/camera @capacitor/filesystem @capacitor/share
   ```

2. 修改 `src/pages/scanPage.js`（图片选择原生化）：
   - 添加检测：`const isNative = () => typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()`
   - Native 环境：调用 `Camera.getPhoto({ resultType: 'base64', source: 'prompt' })`
   - Web 环境或 Camera 失败：降级到原有 `<input type="file">` 逻辑
   - 全部调用包裹 try/catch，失败时静默降级

3. 修改 `src/services/shareService.js`（分享层级化）：
   - 第一优先：`Share.share()`（Capacitor）
   - 第二优先：`navigator.share()`（Web Share API）
   - 最终降级：复制到剪贴板（现有逻辑）
   - 全部包裹 try/catch

4. 修改 `src/index.html`：
   - viewport meta 改为：`content="width=device-width, initial-scale=1, viewport-fit=cover"`

5. 修改 `src/styles.css`（安全区）：
   - 底部：`padding-bottom: max(env(safe-area-inset-bottom, 0px), 1rem)`

6. 新建 `docs/ios-plist-additions.md`，说明人工在 Xcode 中需要添加的 Info.plist 权限描述：
   ```
   NSCameraUsageDescription = "用于扫描食品成分表"
   NSPhotoLibraryUsageDescription = "用于从相册选择食品包装图片"
   ```

**涉及文件**：
- `src/pages/scanPage.js`
- `src/services/shareService.js`
- `src/index.html`
- `src/styles.css`
- `docs/ios-plist-additions.md`（新建）
- `scripts/test.mjs`（新增 Camera/Share 降级测试：非 native 环境不崩溃）

**验收标准**：
```bash
npm run lint && npm run test && npm run build && npx cap sync
# 桌面浏览器手动验证：扫描页 file input 可正常使用
```

---

### Batch 2-D：iOS 工程配置 `[人工]`

**状态**：⏳ 待 Batch 2-C 完成后人工执行

- [ ] 注册 Apple Developer Program（$99/年）
- [ ] 安装最新稳定版 Xcode
- [ ] 运行 `npm run cap:open:ios`，在 Xcode 打开工程
- [ ] Bundle Identifier 设为：`com.compcheck.app`
- [ ] Automatic signing，选择开发者账号
- [ ] App Display Name 设为：`成分小查`
- [ ] 按 `docs/ios-plist-additions.md` 在 Info.plist 添加相机和相册权限描述
- [ ] Launch Screen：白色背景 + "成分小查" 文字
- [ ] 最低支持 iOS：iOS 15.0
- [ ] 真机 Build & Run，验证首页/搜索/扫描入口可用
- [ ] 上传 TestFlight，至少 1 名内测用户可安装
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 2-E：Android 工程配置 `[人工]`

**状态**：⏳ 待 Batch 2-C 完成后人工执行

- [ ] 注册 Google Play Developer 账号（一次性 $25）
- [ ] 安装最新稳定版 Android Studio
- [ ] 运行 `npm run cap:open:android`，在 Android Studio 打开工程
- [ ] applicationId 设为：`com.compcheck.app`
- [ ] 最低 SDK：API 24（Android 7.0）
- [ ] 生成签名 keystore，**妥善离线备份密码**
- [ ] 配置 release 签名
- [ ] App 名称：`成分小查`
- [ ] AndroidManifest.xml 添加权限：`CAMERA`、`READ_EXTERNAL_STORAGE`
- [ ] 真机 Build & Run，验证首页/搜索/扫描入口可用
- [ ] 生成 AAB，上传 Google Play 内测轨道
- [ ] 添加至少 12 名测试者，记录内测开始日期（**Google Play 新账号须 14 天闭测才能申请正式发布**）
  - 内测开始日期：`[填写]`
  - 预计可申请正式发布日期：`[填写，= 开始日期 + 14 天]`
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

---

## 阶段 3：M3 后端基础设施

> 后端位于同一仓库的 `backend/` 子目录，与前端共用 Git 仓库和 PR 流程。
> **M3 可与 M2 并行进行，不阻塞移动端工作。**

### 前置人工操作（后端基础设施选型） `[人工]`

**状态**：⏳ 待完成 — 建议在 M2 进行时并行决策

- [ ] 选择数据库托管平台（推荐 Railway PostgreSQL 或 Supabase）
- [ ] 选择后端部署平台（推荐 Railway 或 Fly.io）
- [ ] 在对应平台创建账号，获取生产数据库连接字符串
- [ ] 在此处填写选型结果：
  - 数据库平台：`[填写]`
  - 后端部署平台：`[填写]`
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 3-A：后端项目初始化 `[Codex]`

**状态**：⏳ 待开始（可与 M2 并行，不依赖 2-A/2-B）

**任务描述**：在仓库根目录下创建 `backend/` 子目录：

1. 目录结构：
   ```
   backend/
     src/
       routes/
       services/
       db/
       middleware/
     tests/
     .env.example
     package.json
     tsconfig.json
     Dockerfile
     docker-compose.yml
     README.md
   ```

2. 初始化依赖（`backend/package.json`，name: `compcheck-api`）：
   ```bash
   cd backend
   npm install hono @hono/node-server drizzle-orm pg dotenv
   npm install --save-dev typescript tsx vitest @types/node @types/pg drizzle-kit
   ```

3. `backend/src/index.ts`：
   - `GET /health` 返回 `{ "status": "ok", "version": "0.1.0", "timestamp": "..." }`
   - CORS 中间件（允许 `CORS_ORIGIN` 环境变量指定的域名）
   - 请求日志中间件（method + path + status + 耗时 ms）
   - 全局错误处理（未处理异常返回 JSON 格式 500，不泄露堆栈）

4. `backend/docker-compose.yml`：PostgreSQL 15 + 后端服务，环境变量从 `.env` 读取

5. `backend/.env.example`：
   ```env
   DATABASE_URL=postgres://postgres:password@localhost:5432/compcheck
   PORT=3000
   CORS_ORIGIN=http://localhost:5173
   JWT_SECRET=（至少 32 位随机字符串）
   OCR_API_KEY=
   OCR_PROVIDER=aliyun
   AI_API_KEY=
   AI_PROVIDER=anthropic
   SENTRY_DSN=
   ```

6. 根目录 `.gitignore` 追加：`backend/node_modules/`、`backend/dist/`、`backend/.env`

**验收标准**：
```bash
cd backend
cp .env.example .env  # 填写本地数据库配置
npm run dev           # 服务启动无报错
curl http://localhost:3000/health   # {"status":"ok",...}
npx tsc --noEmit      # TypeScript 无编译错误
npm test              # Vitest 通过
```

---

### Batch 3-B：数据库 Schema 与成分 API `[Codex]`

**状态**：⏳ 待开始（依赖 3-A 完成）

**任务描述**：

1. `backend/src/db/schema.ts`：定义 Drizzle 表
   - `ingredients`：主表，含所有 `FoodAdditive` 字段（数组字段用 JSONB）
   - `ingredient_sources`：来源关联表

2. 生成迁移并运行：
   ```bash
   npx drizzle-kit generate:pg && npm run db:migrate
   ```

3. 种子脚本 `backend/scripts/seed.ts`：
   - 读取 `../src/data/foodAdditives.js`（相对路径）
   - 将 100 条数据 upsert 到 `ingredients`（幂等）

4. API 接口（`backend/src/routes/ingredients.ts`）：
   - `GET /api/ingredients?q=&category=&riskLevel=&page=1&limit=20`
   - `GET /api/ingredients/categories`
   - `GET /api/ingredients/:id`（不存在返回 404）
   - 非法参数返回 400

**涉及文件**：
- `backend/src/db/schema.ts`
- `backend/src/db/migrations/`
- `backend/src/routes/ingredients.ts`
- `backend/src/services/ingredientService.ts`
- `backend/scripts/seed.ts`
- `backend/tests/ingredients.test.ts`
- `backend/package.json`（添加 `db:migrate`、`db:seed` 脚本）

**验收标准**：
```bash
cd backend
npm run db:migrate && npm run db:seed   # 输出"Seeded 100 ingredients"
curl "http://localhost:3000/api/ingredients?q=苯甲酸"
curl "http://localhost:3000/api/ingredients/sodium-benzoate"
curl "http://localhost:3000/api/ingredients/not-exist"   # 返回 404
npm test
```

---

### Batch 3-C：账号与鉴权 `[Codex]`

**状态**：⏳ 待开始（依赖 3-B 完成）

**任务描述**：

1. 安装依赖：
   ```bash
   cd backend
   npm install bcrypt jsonwebtoken
   npm install --save-dev @types/bcrypt @types/jsonwebtoken
   ```

2. Drizzle 迁移新增表：`users`（id, email, password_hash, created_at）、`sessions`（token, user_id, expires_at）

3. API 接口（`backend/src/routes/auth.ts`）：
   - `POST /api/auth/register`：邮箱格式校验 + 密码最少 8 位 + bcrypt hash（rounds: 12）+ 返回 JWT
   - `POST /api/auth/login`：验证密码，返回 JWT（有效期 7 天）
   - `POST /api/auth/logout`：标记 token 失效
   - `GET /api/auth/me`：需 JWT，返回用户信息（不含密码 hash）
   - `DELETE /api/auth/account`：需 JWT，级联删除用户所有数据
   - 邮箱已注册返回 409，格式不合法返回 400

4. JWT 鉴权中间件（`backend/src/middleware/auth.ts`）：
   - 解析 `Authorization: Bearer <token>`
   - 无效/过期 token 返回 401 JSON
   - 有效时将 `userId` 注入 Hono context

**涉及文件**：
- `backend/src/db/schema.ts`（追加 users/sessions）
- `backend/src/routes/auth.ts`
- `backend/src/services/authService.ts`
- `backend/src/middleware/auth.ts`
- `backend/tests/auth.test.ts`

**验收标准**：
```bash
cd backend && npm run db:migrate
# 注册 → 登录 → 获取 me → 删除账号完整流程可跑通
# 无效 JWT 访问 /api/auth/me 返回 401
npm test
```

---

### Batch 3-D：收藏与历史云同步 `[Codex]`

**状态**：⏳ 待开始（依赖 3-C 完成）

**任务描述**：

1. Drizzle 迁移新增表：`user_favorites`、`user_history`、`user_allergens`、`user_reports`

2. API 接口（均需 JWT 鉴权）：
   - `GET/POST/DELETE /api/user/favorites`
   - `GET/POST/DELETE /api/user/history`
   - `GET/PUT /api/user/allergens`（PUT 整体替换）
   - `GET/POST/DELETE /api/user/reports`

3. **前端联动** — 修改 `src/services/storageService.js`：
   - 新增 `isLoggedIn()`：检查 localStorage 中是否有有效 JWT
   - 登录状态下：读写同时调用后端 API
   - 未登录时：保持原有 localStorage 行为
   - API 调用失败时：静默降级到本地存储，不崩溃
   - 冲突策略：以服务端数据为准（last-write-wins）

**涉及文件**：
- `backend/src/db/schema.ts`（追加 4 张表）
- `backend/src/routes/user.ts`
- `backend/src/services/userService.ts`
- `backend/tests/user.test.ts`
- `src/services/storageService.js`（前端）
- `scripts/test.mjs`（前端，新增未登录时 storageService 行为不变的测试）

**验收标准**：
```bash
cd backend && npm test
npm run lint && npm run test && npm run build
```

---

## 阶段 4：M4 订阅支付与权益

> Apple IAP 和 Google Play Billing **必须服务端校验**，前端不能作为唯一判断。

### Batch 4-A：套餐设计与权益服务 `[Codex]`

**状态**：⏳ 待开始（依赖 3-D 完成）

**任务描述**：

1. Drizzle 迁移新增 `entitlements` 表：
   `user_id, plan ('free'|'pro'), valid_until, platform ('apple'|'google'|null), receipt_data (JSONB), updated_at`

2. `backend/src/services/entitlementService.ts`：
   - `getEntitlement(userId)` → `{ plan, validUntil, isExpired }`
   - `checkUsageLimit(userId, feature: 'ocr'|'ai_report')` → `{ allowed, used, limit, resetAt }`
   - 免费额度：OCR 每月 5 次，AI 报告每月 3 次（按 UTC 月份计数）

3. API 接口：
   - `GET /api/user/entitlement`（需 JWT）
   - `POST /api/user/entitlement/verify`（接收 Apple/Google 票据，校验后写入）

4. 用量限制中间件 `backend/src/middleware/usageLimit.ts`：
   - OCR 和 AI 接口调用前检查
   - 超额返回 `402 { "error": "usage_limit_exceeded", "feature": "ocr", "limit": 5, "resetAt": "..." }`

5. **前端联动** — 修改 `src/services/membershipService.js`：
   - 登录状态下从 `/api/user/entitlement` 获取权益（本地缓存 5 分钟）
   - 未登录时保持本地 Free 逻辑

**验收标准**：
```bash
cd backend && npm test
# Free 用户超额后调用 OCR/AI 接口返回 402
npm run lint && npm run test && npm run build
```

---

### Batch 4-B：Apple IAP 接入 `[人工+Codex]`

**状态**：⏳ 待 4-A 完成 + 人工操作

**人工操作（先做）**：
- [ ] App Store Connect 创建自动续订订阅：月付 `com.compcheck.pro.monthly`，年付 `com.compcheck.pro.yearly`
- [ ] 配置订阅组（Group Name: CompCheck Pro），设置免费试用期（建议 7 天）
- [ ] 创建沙盒测试账号（至少 1 个）
- [ ] 生成 App Store Connect API Key（.p8 文件），用于服务端 JWS 校验
- [ ] 将以下配置到后端环境变量：`APPLE_KEY_ID`、`APPLE_ISSUER_ID`、`APPLE_PRIVATE_KEY`（.p8 内容 Base64）
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. 安装前端插件：`npm install @capacitor-community/in-app-purchases`

2. 新建 `src/services/purchaseService.js`：
   - `initializePurchases()`、`getProducts()`、`purchaseProduct(productId)`、`restorePurchases()`
   - 成功后将收据发送到 `POST /api/user/entitlement/verify`，刷新权益缓存
   - 全部包裹 try/catch

3. 修改 `src/pages/membershipPage.js`：接入购买/恢复流程

4. `backend/src/services/appleIapService.ts`：
   - 使用 Apple App Store Server API v2 验证 JWS 交易
   - 有效订阅写入 `entitlements` 表

5. `backend/src/routes/webhooks/apple.ts`：
   - 接收 App Store Server Notifications v2，验证 JWS 签名
   - 处理 `SUBSCRIBED`、`EXPIRED`、`REFUND` 事件

**验收标准**：
- 沙盒账号可完成购买、恢复购买
- 服务端 `entitlements` 表记录正确更新
- Webhook 收到 EXPIRED 事件后权益更新

---

### Batch 4-C：Google Play Billing 接入 `[人工+Codex]`

**状态**：⏳ 待 4-B 完成 + 人工操作

**人工操作（先做）**：
- [ ] Google Play Console 创建订阅商品（Product ID 与 Apple 保持同名）
- [ ] 配置 Real-time Developer Notifications（Google Cloud Pub/Sub）
- [ ] 创建 Google Play Android Developer API 服务账号，下载 JSON 密钥
- [ ] 将 JSON 密钥内容（Base64）配置到后端环境变量：`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- [ ] 创建 license tester 账号
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. `backend/src/services/googlePlayService.ts`：使用 Google Play Developer API 验证购买 token，写入 `entitlements` 表

2. `backend/src/routes/webhooks/google.ts`：接收 Pub/Sub 消息，处理 `subscription_renewed`/`canceled`/`expired`

3. `src/services/purchaseService.js`：复用已有框架，Android 分支通过 `Capacitor.getPlatform() === 'android'` 区分

**验收标准**：
- License tester 可完成购买、恢复、取消流程
- 与 Apple 权益共用同一套 `entitlements` 表

---

## 阶段 5：M5 OCR 与 AI 分析

### Batch 5-A：OCR 服务端代理 `[人工+Codex]`

**状态**：⏳ 待 3-C 完成 + 人工选型

**人工操作（先做）**：
- [ ] 选择 OCR 供应商（推荐：阿里云通用文字识别 或 腾讯云 OCR）
- [ ] 申请 API Key，配置到后端环境变量：`OCR_API_KEY`、`OCR_PROVIDER=aliyun`
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. 安装依赖：
   ```bash
   cd backend && npm install sharp @alicloud/ocr-api20210707 @alicloud/openapi-client
   ```

2. `backend/src/routes/ocr.ts`（需 JWT 鉴权 + 用量限制中间件）：
   - 接收 `POST /api/ocr { imageBase64: string, mimeType: string }`
   - 用 `sharp` 压缩到 1 MB 以内
   - 调用 OCR 供应商 API，返回 `{ text, confidence }`
   - Free 超额返回 402

3. 修改 `src/services/ocrService.js`（前端）：
   - 登录状态下替换为真实后端地址 `/api/ocr`
   - 未登录时保持本地 fallback

**验收标准**：
```bash
cd backend && npm test
# 真实食品包装图片测试（至少 3 张），准确率 ≥ 70%
# Free 超额返回 402
npm run lint && npm run test && npm run build
```

---

### Batch 5-B：AI 分析服务端代理 `[人工+Codex]`

**状态**：⏳ 待 5-A 完成 + 人工确认

**人工操作（先做）**：
- [ ] 选择 AI 模型（推荐：Anthropic Claude API，`claude-haiku-4-5-20251001` 控制成本）
- [ ] 获取 API Key，配置到后端环境变量：`AI_API_KEY`、`AI_PROVIDER=anthropic`
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. 安装 SDK：`cd backend && npm install @anthropic-ai/sdk`

2. `backend/src/routes/analyze.ts`（需 JWT 鉴权 + 用量限制中间件）：
   - 接收 `POST /api/analyze { text: string, category: 'food'|'cosmetics' }`
   - System prompt 要求输出严格 JSON：
     ```json
     { "overallRisk": "low|medium|high", "summary": "", "ingredients": [], "allergenWarnings": [], "suggestions": [] }
     ```
   - 响应校验不符合 schema 时返回本地 fallback
   - Free 超额返回 402

3. 修改 `src/services/aiAnalysisService.js`（前端）：
   - 登录状态下替换为 `/api/analyze`
   - 未登录时保持本地 fallback

**验收标准**：
```bash
cd backend && npm test
# 真实成分表输入后返回有意义的 AI 分析结果
# AI 输出格式校验覆盖异常响应场景
```

---

## 阶段 6：M6 上架前质量与合规

### Batch 6-A：E2E 测试 `[Codex]`

**状态**：⏳ 待开始（依赖 M1–M5 功能稳定）

**任务描述**：

1. 安装：
   ```bash
   npm install --save-dev playwright @playwright/test
   npx playwright install chromium
   ```

2. 新建 `e2e/` 目录，覆盖以下主流程：
   - `e2e/search.spec.js`：食品搜索 → 详情 → 收藏
   - `e2e/analyze.spec.js`：成分表粘贴分析 → 保存报告 → 查看报告
   - `e2e/allergen.spec.js`：过敏原设置 → 搜索时显示警告
   - `e2e/auth.spec.js`：注册 → 登录 → 收藏同步 → 登出

3. `package.json` 添加：`"test:e2e": "playwright test"`

4. `.github/workflows/ci.yml` 在 test 步骤后新增 E2E 步骤（需启动前端 + 后端服务）

**验收标准**：
```bash
npm run test:e2e      # 4 条流程连续 3 次全部通过，无 flaky
```

---

### Batch 6-B：合规材料最终版 `[人工+Codex]`

**状态**：⏳ 待 M4 完成后

**人工操作（先做）**：
- [ ] 法务复核 `src/data/legalContent.js` 中的隐私政策草案
- [ ] 法务复核服务条款、订阅说明
- [ ] 确认 App Store / Google Play 数据安全问卷填写内容
- [ ] 准备正式客服邮箱（格式：support@your-domain.com）
- [ ] 将隐私政策托管到公开可访问 URL
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：
1. 将 `src/data/legalContent.js` 草案替换为法务确认的正式文本
2. 新建 `docs/app-store-metadata.md`：整理 App Store Connect 和 Google Play Console 所需的所有文案（名称、描述、关键词、隐私政策 URL、客服邮箱）

**验收标准**：
```bash
npm run lint && npm run test && npm run build
```

---

### Batch 6-C：上架资源准备 `[人工]`

**状态**：⏳ 待开始

- [ ] App Icon：1024×1024 PNG，无透明通道，无圆角
- [ ] iOS 截图：iPhone 6.7"、6.5"、5.5"，每尺寸至少 3 张
- [ ] Android 截图：手机尺寸至少 2 张
- [ ] App 短描述（≤ 30 字中文）
- [ ] App 完整描述（中文 400–500 字 + 英文翻译）
- [ ] 将隐私政策上传到 `docs/app-store-metadata.md` 记录的公开 URL
- [ ] 准备审核 demo 账号（演示：订阅、OCR、过敏原警告功能）
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 6-D：生产基础设施配置 `[人工+Codex]`

**状态**：⏳ 待开始（依赖前置后端选型完成）

**人工操作（先做）**：
- [ ] 购买并配置域名
- [ ] DNS：前端域名 → Vercel/Cloudflare，API 子域名 → 后端平台
- [ ] 在 Vercel/Cloudflare Pages 创建前端项目，关联 GitHub 仓库
- [ ] 在 Railway/Fly.io 创建后端服务，关联 GitHub 仓库 `backend/` 目录
- [ ] 配置生产数据库，确认生产 `DATABASE_URL` 可用
- [ ] 配置所有生产环境变量到对应平台：
  - 前端：`APP_BASE_URL`（后端 API 地址）
  - 后端：`DATABASE_URL`、`JWT_SECRET`、`CORS_ORIGIN`、`APPLE_KEY_ID`、`APPLE_ISSUER_ID`、`APPLE_PRIVATE_KEY`、`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`、`OCR_API_KEY`、`AI_API_KEY`、`SENTRY_DSN`
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. 优化 `backend/Dockerfile` 为生产多阶段构建：
   - Stage 1（builder）：编译 TypeScript
   - Stage 2（runner）：仅复制 dist + node_modules，非 root 用户运行
   - `HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1`

2. 新建 `.github/workflows/deploy.yml`（push main 触发）：
   - 前端：触发 Vercel/Cloudflare Pages 部署 webhook
   - 后端：build Docker 镜像，推送到 Railway/Fly.io

3. 新建 `backend/scripts/migrate-prod.sh`：
   - 连接生产数据库执行 Drizzle 迁移，幂等安全
   - 说明：chmod +x 后在生产环境手动运行一次

**验收标准**：
```bash
curl https://your-domain.com               # 200
curl https://api.your-domain.com/health    # {"status":"ok","db":"ok",...}
# CI/CD：push main 后 5 分钟内自动部署生效
```

---

## 阶段 7：M7 正式上线

### Batch 7-A：监控与可观测性 `[Codex]`

**状态**：⏳ 待 6-D 完成后

**任务描述**：

1. 后端错误监控：
   ```bash
   cd backend && npm install @sentry/node
   ```
   在 `src/index.ts` 初始化 Sentry（`SENTRY_DSN` 未配置时跳过初始化）

2. 增强 `GET /health`：
   - 检查数据库连接，返回 `{ "status": "ok|degraded", "db": "ok|error", "version": "...", "uptime": 123 }`
   - 数据库失败时返回 503

3. 前端全局错误捕获（`src/main.js`）：
   - `window.addEventListener('error', ...)` + `window.addEventListener('unhandledrejection', ...)`
   - 向 `POST /api/telemetry/error` 发送摘要（仅错误类型 + 路由，无 PII）

4. `backend/src/routes/telemetry.ts`：接收前端错误上报，写入结构化日志

5. 关键操作结构化日志（后端 console.log）：
   - `{ event: 'iap_verify', platform, result, userId }`
   - `{ event: 'ocr_call', plan, allowed, userId }`

**验收标准**：
```bash
cd backend && npm test
curl http://localhost:3000/health   # 包含 db 字段
npm run lint && npm run test && npm run build
```

---

### Batch 7-B：提交商店审核 `[人工]`

**状态**：⏳ 待 M6 全部完成后人工执行

**App Store Connect**：
- [ ] 填写所有元数据（名称、描述、关键词、截图）
- [ ] 配置隐私政策 URL，完成数据安全问卷
- [ ] 确认 IAP 产品状态（与 Batch 4-B 一致）
- [ ] 填写审核说明：提供 demo 账号（邮箱 + 密码），说明订阅功能测试方式
- [ ] 提交审核（预计等待 1–3 个工作日）
- [ ] 审核通过后选择**手动发布**，等待 Google Play 同步通过后统一发布

**Google Play Console**：
- [ ] 确认 14 天闭测窗口已完成（见 Batch 2-E 记录日期）
- [ ] 填写商店资料，完成数据安全问卷和内容分级
- [ ] 提交生产审核（预计等待 3–7 个工作日）
- [ ] 在此处标注：`[人工完成 ✅ YYYY-MM-DD]`

---

### Batch 7-C：正式发布与验收 `[人工+Codex]`

**状态**：⏳ 待商店审核全部通过后

**人工操作**：
- [ ] App Store 审核通过后点击手动发布（建议工作日上午）
- [ ] Google Play 审核通过后从内测推送到正式轨道
- [ ] 上线后 24 小时内持续监控崩溃日志和错误上报
- [ ] 验证两端用户可下载、搜索、扫描、购买订阅
- [ ] 在此处标注：`[正式上线 ✅ YYYY-MM-DD]`

**Codex 任务**：

1. 新建 `scripts/post-launch-check.sh`：
   ```bash
   #!/bin/bash
   set -e
   echo "=== 上线后验收检查 ==="
   STATUS=$(curl -sf https://api.your-domain.com/health)
   echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status')=='ok' and d.get('db')=='ok', '后端健康检查失败: '+str(d)"
   echo "✅ 后端健康: $STATUS"
   HTTP=$(curl -sf -o /dev/null -w "%{http_code}" https://your-domain.com)
   [ "$HTTP" = "200" ] && echo "✅ 前端可访问 ($HTTP)" || (echo "❌ 前端异常 ($HTTP)" && exit 1)
   echo "=== 检查完成 ==="
   ```

2. 更新 `PROJECT_PLAN.md`：
   - 整体进度更新为 100%
   - 在修改记录中注明正式上线日期和版本

**完整上线验收清单**：
- [ ] iOS 用户可在 App Store 搜索到"成分小查"并安装
- [ ] Android 用户可在 Google Play 搜索到"成分小查"并安装
- [ ] Web 用户可通过浏览器访问
- [ ] 搜索功能正常
- [ ] 扫描页图片选择可用（至少降级路径可用）
- [ ] 订阅购买完整流程可用
- [ ] 服务端权益校验正确（购买后功能解锁）
- [ ] 监控无异常告警

---

## 快速参考：当前最早未完成任务

```
→ Batch 0-A：修复当前测试失败
  文件：src/data/foodAdditives.js（修正 aspartame riskLevel: 'medium'，sucralose riskLevel: 'low'）
  断言位置：scripts/test.mjs:492
```

---

## 完整依赖关系与并行策略

```
0-A → 1-B
       └→ [人工解锁 Vite] → 2-A → 2-B → 2-C → 2-D/2-E [人工，可同时进行]

[人工后端选型] → 3-A → 3-B → 3-C → 3-D   ← 可与 M2 并行开工
                                    └→ 4-A → 4-B* → 4-C*
                                                       │
                           [人工 OCR 选型] → 5-A → 5-B*
                                                     │
                                              6-A → 6-B/6-C/6-D → 7-A → 7-B → 7-C
```

`*` = 需要先完成前置人工操作

**关键人工卡点（每个都不可跳过）**：

| 卡点 | 解锁什么 | 最晚完成时间 |
|---|---|---|
| Vite 约束解锁（readme.md 第 21 节） | Batch 2-A | M2 开始前 |
| Apple Developer 账号 + Xcode | Batch 2-D | M2 进行中 |
| Google Play 账号 + 14 天闭测 | Batch 7-B Android 提交 | **最晚在 M3 开始时启动**（闭测需时间积累） |
| 后端选型（数据库 + 部署平台） | Batch 3-A | M2 进行时并行决定 |
| OCR 供应商 API Key | Batch 5-A | M4 结束前 |
| AI API Key | Batch 5-B | M5-A 完成后 |
| 法务复核合规材料 | Batch 6-B | M4 完成后 |
| 域名 + 生产环境配置 | Batch 6-D | M6 开始前 |
