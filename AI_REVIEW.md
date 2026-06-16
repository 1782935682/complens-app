# AI Review — 2026-06-16

## MP-WEIXIN-A 真机 WXSS 编译修复

### 本轮目标

修复微信开发者工具真机调试时 `app.wxss(1:1143): unexpected token \`*\`` 的 WXSS 编译错误。

### 已检查并修改的文件

- `user-uniapp/src/styles/tokens.css`
- `PROJECT_PLAN.md`
- `AI_REVIEW.md`

### 已完成修改

1. 定位生成产物 `user-uniapp/dist/build/mp-weixin/app.wxss` 中的错误位置，对应源文件 `tokens.css` 的全局 `*` reset。
2. 将全局通配选择器替换为小程序可接受的显式元素选择器：`page`、`view`、`scroll-view`、`text`、`button`、`input`、`textarea`、`image`。
3. 移除 Web-only 的 `::-webkit-scrollbar` 相关选择器，避免真机 WXSS 编译器继续在全局样式里遇到不兼容选择器。
4. 保留字体、盒模型和点击高亮 reset，不改变页面业务逻辑、API、数据口径或小程序 AppID 注入逻辑。

### 影响范围与风险

- 影响范围仅为 `user-uniapp` 全局样式 reset。
- `DATA_SOURCES.md` 无需更新：本轮不涉及食品数据、GB2760、OCR 结果或权威来源。
- 微信开发者工具导入、真实 AppID、request 合法域名、隐私政策和真机验收仍是人工项。

### 验证

- `cd user-uniapp && npm run build:mp-weixin`（通过）
- 检查生成的 `dist/build/mp-weixin/app.wxss`，不再包含 `*{` 或 `::-webkit-scrollbar`（通过）
- `cd user-uniapp && npm run lint`（通过）
- `git diff --check`（通过）
