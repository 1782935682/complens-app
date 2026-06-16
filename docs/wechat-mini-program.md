# 微信小程序对接说明

本文记录 `user-uniapp` 微信小程序形态的构建、导入、后端域名配置和真机验收清单。

## 1. Codex 已覆盖的工程项

- `user-uniapp` 可构建 `mp-weixin` 产物，输出目录为 `user-uniapp/dist/build/mp-weixin`。
- 构建脚本支持通过 `WEIXIN_MP_APPID` 临时注入 AppID，不把真实 AppID 写死到源码。
- 小程序端拍照/相册入口统一走 `uni.chooseImage`，不会使用浏览器 file input。
- 小程序端图片读取走平台文件路径和文件系统；大图 OCR 前优先使用 `uni.compressImage` 压缩。
- 小程序端 API 请求必须配置绝对 `USER_API_BASE_URL`，前端不保存 OCR Key、AI Key，也不直连 OCR/AI/数据库。
- 报告页支持微信原生转发菜单；按钮操作仍保留复制摘要降级。
- `manifest.json` 已声明相机用途说明，最终隐私政策仍需在微信公众平台配置和人工确认。

## 2. 需要你提供或确认

| 项目 | 用途 | 是否必须 |
|---|---|---|
| 微信小程序 AppID | 构建可导入并绑定真实项目 | 已配置本机 `.env.local`：`wx4fbc4f0e40e4068d` |
| 微信开发者工具登录账号 | 导入 `dist/build/mp-weixin`、预览和真机调试 | 必须 |
| 后端 API 域名 | 小程序 `wx.request` 调用后端 | 已配置：`https://api.yxl123.xyz/api` |
| request 合法域名 | 在微信公众平台配置后端域名，正式真机和提交审核需要 | 待在微信公众平台确认：`https://api.yxl123.xyz` |
| HTTPS 证书和域名备案状态 | 小程序正式环境通常要求 HTTPS 合法域名 | HTTPS 已由 Caddy 接通；备案/微信后台校验待确认 |
| 隐私政策最终文本 | 披露拍照/相册、OCR、后端处理和第三方 OCR 供应商 | 提审前必须 |
| 生产 OCR Provider/Key | 真实 OCR 质量；无 Key 时仍走手动输入降级 | 可后置 |

## 2.1 当前测试环境

| 项目 | 当前值 |
|---|---|
| API 域名 | `https://api.yxl123.xyz` |
| API base path | `https://api.yxl123.xyz/api` |
| Caddy 反代 | `api.yxl123.xyz` → `127.0.0.1:3010` |
| 后端服务 | `compcheck-api.service` |
| 健康检查 | `curl https://api.yxl123.xyz/health` |
| 数据接口检查 | `curl "https://api.yxl123.xyz/api/ingredients?limit=1"` |

当前已验证：

- `https://api.yxl123.xyz/health` 返回 `200`。
- `https://api.yxl123.xyz/api/ingredients?limit=1` 能返回数据库数据。
- `compcheck-api.service` 为 `active`。

## 3. 构建命令

无 AppID 的本地构建：

```bash
cd user-uniapp
npm run build:mp-weixin
```

带真实 AppID 和后端地址构建：

```bash
cd user-uniapp
WEIXIN_MP_APPID=wx0000000000000000 \
USER_API_BASE_URL=https://api.example.com/api \
WEIXIN_MP_URL_CHECK=true \
npm run build:mp-weixin
```

也可以把本机调试配置写入 `user-uniapp/.env.local`（已被 gitignore，不能提交真实账号或域名）：

```env
WEIXIN_MP_APPID=wx0000000000000000
USER_API_BASE_URL=https://api.example.com/api
WEIXIN_MP_URL_CHECK=false
```

本地开发者工具调试时可临时关闭合法域名校验：

```bash
cd user-uniapp
WEIXIN_MP_APPID=wx0000000000000000 \
USER_API_BASE_URL=https://dev-api.example.com/api \
WEIXIN_MP_URL_CHECK=false \
npm run dev:mp-weixin
```

说明：

- `WEIXIN_MP_APPID` 只临时写入构建过程和生成产物，不会提交到 `src/manifest.json`。
- `USER_API_BASE_URL` 是公开后端 API base path，不得填写任何密钥。
- H5 仍默认使用 `/api` 和 Vite proxy；小程序没有 H5 proxy，必须使用绝对 URL 或在设置页手工填写。

## 4. 微信开发者工具导入

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择 `user-uniapp/dist/build/mp-weixin`。
4. AppID 填写真实小程序 AppID。
5. 本地调试阶段可按需要勾选“不校验合法域名、web-view 域名、TLS 版本以及 HTTPS 证书”。
6. 进入首页后依次验收：拍照/相册、OCR 降级、文本确认、标签类型、配料/营养解析、匹配确认、报告、历史、关注项、报告分享。

## 5. 微信公众平台配置

在“小程序后台 → 开发管理 → 开发设置 → 服务器域名”中配置：

| 类型 | 建议值 |
|---|---|
| request 合法域名 | 后端 API 域名，例如 `https://api.example.com` |
| uploadFile 合法域名 | 当前主流程不直接用小程序上传接口，可暂不配 |
| downloadFile 合法域名 | 当前主流程不依赖，可暂不配 |
| socket 合法域名 | 当前不使用，可暂不配 |

隐私与权限配置：

- 相机：用于拍摄食品标签图片。
- 相册：用于选择已有食品标签图片。
- 网络请求：用于把图片转成 OCR 请求并获取标签解读结果。
- OCR/AI 第三方供应商：上线前需按真实供应商披露；本地 RapidOCR 不作为公网第三方服务暴露给小程序。

## 6. 真机验收清单

| 流程 | 验收点 |
|---|---|
| 首次打开 | 首页、底部导航和页面样式无明显错位 |
| 拍照 | 可调起相机，拒绝权限时有错误提示和手动输入路径 |
| 相册 | 可选择图片，图片不会写入小型键值存储 |
| OCR | 后端地址缺失/不可达时进入手动输入，不返回假识别文字 |
| 文本确认 | OCR 成功或手动输入后必须进入确认页 |
| 报告 | 可生成食品标签解读报告，文案不输出医疗化或购买结论 |
| 历史 | 报告可保存、可再次打开 |
| 分享 | 报告页可触发微信转发或复制摘要降级 |
| 设置 | 可查看/修改后端 API 基址 |
| 隐私 | 可打开隐私说明页 |

## 7. 当前仍需人工完成

- 提供真实 `WEIXIN_MP_APPID`。
- 提供可被小程序访问的 HTTPS 后端 API 域名。
- 在微信公众平台配置 request 合法域名。
- 用微信开发者工具完成真机预览验收。
- 提审前确认隐私政策最终文本、OCR 供应商披露和服务条款。
