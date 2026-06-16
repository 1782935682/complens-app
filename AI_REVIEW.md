# AI Review — 2026-06-16

## MP-WEIXIN-A 构建脚本修复

### 本轮目标

修复 Windows 执行 `npm run build:mp-weixin` 时出现 `系统找不到指定的路径。`，并消除旧启动方式触发的 Node `DEP0190` 风险提示。

### 已检查并修改的文件

- `user-uniapp/scripts/mp-weixin.mjs`
- `docs/wechat-mini-program.md`
- `COMMANDS.md`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

### 已完成修改

1. 小程序构建脚本不再直接调用 `node_modules/.bin/uni` 或 Windows `uni.cmd` shim。
2. 脚本改为使用当前 Node 可执行文件 `process.execPath` 直接启动 `@dcloudio/vite-plugin-uni/bin/uni.js`，避免 Windows shell 路径转换和 `.cmd` shim 问题。
3. 当 uni CLI 入口缺失时，脚本输出明确的 `npm install` 修复提示，而不是只返回低信息量路径错误。
4. 补充 Windows / Git Bash 小程序构建排查说明，覆盖 `系统找不到指定的路径。` 和 `DEP0190` 场景。

### 影响范围与风险

- 仅改变小程序构建脚本的 CLI 启动方式，不改变 `manifest.json` 注入逻辑、AppID 处理、API base path、页面代码或数据口径。
- `DATA_SOURCES.md` 无需更新：本轮不涉及食品数据、GB2760、OCR 结果或权威来源。
- 微信开发者工具导入、真实 AppID、request 合法域名、隐私政策和真机验收仍是人工项。

### 验证

- `cd user-uniapp && npm run lint`（通过）
- `cd user-uniapp && npm run build:mp-weixin`（通过）
- `git diff --check`（通过）
