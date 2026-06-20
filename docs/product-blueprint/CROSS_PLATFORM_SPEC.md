# CompLens / 成分镜 跨端开发规范（CROSS_PLATFORM_SPEC）

> 本文属于 `docs/product-blueprint/` 蓝图集，与下列文档配套阅读：
> - [`README.md`](./README.md)：蓝图集索引和阅读顺序
> - [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)：产品定位与 MVP 边界
> - [`FRONTEND_SPEC.md`](./FRONTEND_SPEC.md)：前端工程规范
> - [`API_CONTRACT.md`](./API_CONTRACT.md)：API 契约
> - [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)：设计系统 / design tokens
>
> 本文只描述跨端开发规范，不修改业务代码；涉及页面、接口、可信状态时必须同步引用上述文档。

## 0. 范围与策略

CompLens / 成分镜是面向普通消费者的“食品标签拍照解读与消费决策助手”。目标支持平台：

- Web / PWA
- 微信小程序
- Android App
- iOS App
- Web 管理后台

**当前真实状态：**

- **正式用户端**：`user-uniapp`，uni-app + Vue3，目标覆盖 H5/PWA、微信小程序、Android、iOS；当前 H5 与微信小程序构建已通过，真机权限和平台开发者工具验收后置。
- **当前 `src/` 为历史 Web / PWA 原型**，已具备 PWA 安装 / 离线基础，保留为迁移来源。
- **历史移动端原型**通过 **Capacitor 7.x** 接入原生能力：
  - `@capacitor/camera`：原生相机 / 相册，Web 端降级为文件输入（file input）。
  - `@capacitor/share`：原生分享，Web 端降级为 Web Share API / 复制。
  - `@capacitor/filesystem`：原生文件读写。
  - `ios/`、`android/` 为本机生成的目录（已存在）。
- **微信小程序工程构建已可生成**（`user-uniapp/dist/build/mp-weixin`），已补 AppID 环境注入、平台图片缓存、`uni.compressImage` 压缩、报告转发和导入说明；仍需微信开发者工具导入、真机拍照/相册和隐私权限验收；不在旧 `src/` 上补小程序适配。
- **Web 管理后台尚未独立建设**（待办 / 待确认）。

**跨端策略（核心约束）：**

1. 正式用户端采用 **uni-app + Vue3**，统一规划 H5/PWA、微信小程序、Android、iOS。
2. 当前纯 JS + Vite 前端仅作为历史原型和迁移来源，不继续承载复杂新功能。
3. 管理后台以 **admin-web：Vue3 + TDesign Web** 单独建设，不复用消费端的拍照主流程。
4. **不强行用一套 UI 代码覆盖所有端**。统一的是：**产品流程、design tokens、数据状态、API 契约、文案规范**；UI 实现允许各端差异化。
5. 用户端默认体验围绕“拍食品标签 → 文本确认 → 我的关注项 → 食品标签解读报告”；专业数据源和法规依据折叠展示。
6. 所有端只能通过后端 API 访问 OCR / AI / 数据库；前端不能暴露 OCR Key / AI Key。
7. OCR 服务由后端代理调用，不直接暴露公网给用户端。
8. 小程序 / App 代码不得假设存在 `window` / `document` / `navigator`；所有平台能力必须通过适配层隔离。

---

## 1. 平台差异

各平台在“相机 / 选图 / 运行环境”上的能力差异如下。

### 1.1 H5 / PWA（正式 user-uniapp + 历史 Web 原型）
- 正式：由 `user-uniapp` 编译 H5/PWA 形态，`npm run build:h5` 已通过。
- 历史原型：当前 `src/` 使用浏览器 `file` / `camera` input（`<input type="file" accept="image/*" capture>`）。
- 运行环境：可使用 `window` / `document` / `navigator`，但需对其能力做特性检测（如 `navigator.share` 是否存在）。
- 分享：优先 Web Share API（`navigator.share`），不可用时降级为复制链接 / 文本。
- 离线 / 安装：依赖 PWA（Service Worker + manifest）。

### 1.2 微信小程序（构建已通过 / 真机后续）
- 拍照 / 选图：必须使用 `wx.chooseMedia`（新）/ `wx.chooseImage`（旧），**不能**使用浏览器 file input。
- 运行环境：**不应假设存在 `window` / `document` / `navigator`**。小程序运行在双线程逻辑层，没有标准 DOM / BOM。任何直接访问 `window`、`document`、`navigator` 的代码都需要在适配层隔离。
- 本地缓存：使用小程序文件系统（`wx.getFileSystemManager` / 本地临时文件路径），不能用 IndexedDB / localStorage。
- 分享：使用小程序原生转发（`onShareAppMessage` 等），不能用 Web Share。
- 当前状态：`user-uniapp` 可执行 `npm run build:mp-weixin` 并生成 `dist/build/mp-weixin`；构建脚本支持 `WEIXIN_MP_APPID` / `USER_API_BASE_URL` / `WEIXIN_MP_URL_CHECK`；拍照/相册、文件缓存、OCR 图片压缩和报告分享已有小程序适配，微信开发者工具导入、真机拍照/相册和隐私弹窗验收待人工完成。

### 1.3 Android App（正式 uni-app，历史 Capacitor 原型）
- 正式：由 `user-uniapp` 编译 Android App，平台能力经 uni-app API / 原生插件适配。
- 历史原型：`@capacitor/camera` 提供原生相机 / 相册。
- 权限：需声明并运行时申请**相机权限**与**相册 / 媒体读取权限**（Android 13+ 为 `READ_MEDIA_IMAGES`）。
- 运行环境：WebView 内运行，`window` 等存在，但应通过 `nativeBridgeService.isNativePlatform()` 判定走原生路径。
- 本地缓存：可用 `@capacitor/filesystem`（平台文件缓存），亦可复用 WebView 内的 IndexedDB（视实现而定，待确认统一策略）。

### 1.4 iOS App（正式 uni-app，历史 Capacitor 原型）
- 正式：由 `user-uniapp` 编译 iOS App，平台能力经 uni-app API / 原生插件适配。
- 历史原型：`@capacitor/camera` 提供原生相机 / 相册。
- 权限：需在 `Info.plist` 声明相机（`NSCameraUsageDescription`）与相册（`NSPhotoLibraryUsageDescription` / `NSPhotoLibraryAddUsageDescription`）用途说明，否则会崩溃 / 被拒。
- 运行环境：WKWebView 内运行，同样应通过 `isNativePlatform()` 判定。
- 本地缓存：同 Android，使用 `@capacitor/filesystem` 平台文件缓存。

### 1.5 Web 管理后台（admin-web，计划）
- **不需要相机 / 拍照主流程**。后台以审核、配置、数据管理为主。
- 运行环境：标准浏览器，可用 `window` / `document` / `navigator`。
- 技术栈：Vue3 + TDesign Web。
- 当前状态：**尚未独立建设，待确认。**

### 1.6 当前抽象现状（迁移参考）
Capacitor 的原生能力已抽象在 `src/services/nativeBridgeService.js`，其中：
- `isNativePlatform()` —— 判定是否原生平台（基于 `Capacitor.isNativePlatform()`）。
- `getNativeCameraPhoto()` / `getNativePhoto(source)` —— 原生拍照 / 取图，**非原生平台返回降级路径**（交由 Web 文件输入处理）。
- `shareWithNative(payload)` —— 原生分享，非原生平台不执行（交由 `shareService` 降级）。

> 注意：当前抽象覆盖历史原型的 **Web 降级 + Capacitor 原生**。正式 `user-uniapp` 应重新定义平台适配层，不把旧 `nativeBridgeService` 作为小程序最终方案。

---

## 2. 图片处理

所有平台统一遵守以下图片规则：

- **上传前压缩**，并**限制大小**（当前上限 **8MB**）。
- **图片 / blob 不写入 `localStorage`**。
- **H5 / PWA**：图片使用 **IndexedDB** 存储，数据库 `compcheck-images`、对象仓库 `scan-images`（见 `src/services/imageStoreService.js`）；`indexedDB` 不可用时降级为内存存储。
- **微信小程序 / App**：使用**平台文件缓存**（小程序文件系统 / Capacitor Filesystem），不复用浏览器 IndexedDB 语义。
- **图片上传后由后端调用 OCR**，前端不直接访问 OCR 服务，也不直接做最终 OCR 决策。

---

## 3. 安全规则

- **前端不暴露 OCR / AI Key**（任何端均不得在客户端代码或配置中内置密钥）。
- **所有端通过后端 API 调用 OCR / AI**，不在客户端直连第三方 OCR / AI 服务。
- **OCR 服务不直接暴露公网**：本机 RapidOCR 通过后端代理访问，客户端只与自家后端通信。
- 本地 OCR 服务目标地址：`http://127.0.0.1:18080/ocr`；后端通过 `OCR_LOCAL_URL` 调用，并兼容旧的 `OCR_SERVICE_URL`。

---

## 4. OCR 流程规则

- **OCR 失败必须允许手动输入**（不能因为识别失败而阻断用户）。
- **OCR 结果必须进入文本确认页**，由用户校对。
- **OCR 结果不能直接作为最终分析结论**。
- **用户确认后才进入配料解析**。
- Provider 优先级与降级链：`real(rapidocr / aliyun)` → `manual` → `fallback`。
- **无 Key 不崩溃**：缺少密钥时走降级路径而非报错中断。
- **mock 必须标注**：mock 结果需明确标识，避免被误当作真实识别。

---

## 5. 平台能力矩阵

单元格取值：**支持 / 部分支持 / 后续 / 不支持**。基于当前真实状态填写。

| 能力 | Web / PWA | 微信小程序 | Android | iOS | 管理后台 |
| --- | --- | --- | --- | --- | --- |
| 拍照 | 支持（正式 user-uniapp H5；历史原型 file input） | 部分支持（`uni.chooseImage` + 相机权限说明，需真机验收） | 部分支持（需真机权限验收） | 部分支持（需真机权限验收） | 不支持（无需） |
| 相册上传 | 支持（正式 user-uniapp H5；历史原型 file input） | 部分支持（`uni.chooseImage` + 平台文件缓存，需真机验收） | 部分支持（需真机权限验收） | 部分支持（需真机权限验收） | 不支持（无需） |
| 图片压缩 | 支持（历史原型已有；正式端使用 uni compressed） | 部分支持（`uni.compressImage` 已接入 OCR 前压缩，待真机验收） | 部分支持（待真机验收） | 部分支持（待真机验收） | 不支持（无需） |
| OCR | 支持（经后端） | 部分支持（经后端 adapter，待后端域名和真机验收） | 部分支持（经后端 adapter，待真机验收） | 部分支持（经后端 adapter，待真机验收） | 部分支持（审核查看，非主流程） |
| 本地缓存 | 支持（历史原型 IndexedDB；正式端 uni storage 保存元数据） | 部分支持（uni storage 元数据 + 平台文件缓存，待真机验收） | 部分支持（uni storage 元数据；平台文件缓存待验收） | 部分支持（uni storage 元数据；平台文件缓存待验收） | 后续 |
| 历史记录 | 支持（本地/登录后同步；正式端本地 MVP） | 部分支持（本地 MVP，待真机验收） | 部分支持（本地 MVP，待真机验收） | 部分支持（本地 MVP，待真机验收） | 部分支持（管理视角） |
| 分享 | 支持（正式端复制降级；历史原型 Web Share / 复制） | 部分支持（报告页原生转发 + 复制降级，待真机验收） | 部分支持（share adapter 预留） | 部分支持（share adapter 预留） | 不支持（无需） |
| 登录 | 支持 | 后续（微信授权登录） | 支持 | 支持 | 后续（独立后台账号） |
| 支付 | 后续 / 后置 | 后续 / 后置（微信支付） | 后续 / 后置 | 后续 / 后置 | 不支持（无需） |
| 推送 | 后续 | 后续（模板消息 / 订阅消息） | 后续 | 后续 | 后续 |
| 离线 | 支持（PWA 基础） | 后续 | 部分支持（WebView 缓存） | 部分支持（WebView 缓存） | 后续 |

> 说明：标注为“部分支持”的项表示工程 adapter 或构建链路已具备，但仍需微信开发者工具、Android/iOS 真机、权限和文件缓存验收。支付为“后续 / 后置”；推送为“后续”。

---

## 6. 适配接口设计建议

建议把所有平台差异**收敛到统一适配层**，对上层 UI / 业务暴露同一套接口，各端提供各自实现：

### 6.1 相机 / 相册 —— `nativeBridgeService`
- 现状（已存在）：`src/services/nativeBridgeService.js` 已抽象 `isNativePlatform()`、`getNativePhoto()`、`getNativeCameraPhoto()`、`shareWithNative()`，覆盖 **Capacitor 原生 + Web 降级**。
- 已补：`user-uniapp/src/platform/camera.ts` 通过 `uni.chooseImage` 接入小程序拍照 / 相册，并把小程序文件路径标记为平台文件缓存；不依赖 `window` / `document` / `navigator`。
- 建议统一接口（约定，非现有签名强制）：
  - `isNativePlatform(): boolean`
  - `getPhoto(source: 'camera' | 'album' | 'prompt'): Promise<{ blob | filePath, mime, size }>`
  - 各端实现遵守“失败可降级到手动输入”的 OCR 规则。

### 6.2 本地存储 —— `imageStoreService` + `storageService`
- 现状（已存在）：
  - `src/services/imageStoreService.js`：图片 / blob 存储，H5/PWA 走 IndexedDB（`compcheck-images` / `scan-images`），`indexedDB` 不可用时降级内存。提供 `saveImage` / `getImage` / `deleteImage` / `listImages` / `cleanOldImages`。
  - `src/services/storageService.js`：键值 / 鉴权信息存储，基于 `window.localStorage`，不可用时降级内存（`readJson` / `writeJson` / `readRaw` / `writeRaw` 等）。**图片不入此处。**
- 已补：微信小程序通过 `uni.saveFile` 保存平台文件路径，OCR 前可用小程序文件系统读取 base64；键值存储走 `uni.getStorageSync` / `uni.setStorageSync`，只保存元数据与用户设置。

### 6.3 分享 —— `shareService`
- 现状（已存在）：`src/services/shareService.js` 提供 payload 构建（`buildIngredientSharePayload` / `buildReportSharePayload` / `buildCompareSharePayload`）、`formatShareText`、`buildShareUrl`，以及 `sharePayloadWithFallback`（Web Share → 复制降级）。原生分享委托给 `nativeBridgeService.shareWithNative`。
- 已补：报告页接入 `onShareAppMessage`，共享同一报告分享 payload；按钮操作仍保留复制摘要降级。

### 6.4 统一原则
- 上层 UI / 业务**只调用适配层接口**，不直接判断平台、不直接访问 `window` / `document` / `navigator` / `wx`。
- 平台判定集中在适配层（如 `isNativePlatform()` 及后续小程序判定）。
- 统一的契约是：**产品流程、设计 token、数据状态、API 契约**；UI 与平台原生 API 的对接由各端适配实现承担。

---

> 本文档中标注“待确认”的内容，均因当前仓库未提供对应实现或文档而无法核实，落地前需补充确认，不得据此当作已实现能力。
