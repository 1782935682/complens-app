# Project Plan

## 快速进度速览

> 整体产品进度：**55%**（新口径：OCR 拍照识别产品闭环为核心，数据底座 + 数据库对接优先；订阅、支付、上架、iOS/Android 签名后置）

### 2026-06-12 优先级重排（已更新）

**产品定位**：CompLens / 成分镜 是一个面向普通用户的**食品配料表拍照识别与成分分析 App**。OCR 拍照识别是核心功能，成分搜索是辅助功能。

当前项目优先级调整为：

1. 食品成分/食品添加剂数据源准确性
2. 数据完整度
3. 数据库真实对接（生产级）
4. **OCR 拍照识别产品闭环**（核心功能，必须前置）
5. 配料表文本解析和成分匹配
6. 食品配料分析报告
7. 产品档案、收藏、历史
8. 账号登录与跨设备同步验收
9. 移动端 / PWA 使用体验
10. AI 总结和解释
11. 订阅、支付、上架（必须后置）

本阶段主线按现有 `src/data/foodAdditives.js` 推进食品添加剂 / 食品成分方向，不继续混入新的化妆品、护肤品或药品数据。订阅、支付、上架、iOS/Android 签名后置，直到 OCR 产品闭环和可信数据底座稳定。

关键边界：

- 当前食品基础库为 112 条：5 条 `verified_regulation` GB 2760 官方法规条款、27 条 `verified_jecfa` 安全评价匹配、12 条 `common_ingredient` 普通配料词库、68 条 `unverified` seed 参考；GB 2760-2024 官方标准文本来源已确认，首批 5 条已根据官方 PDF 表 A.1 写入使用范围和限量；官方 PDF 全 264 页已转换为逐页全文数据并可入库，表 A.1 PDF 第 8-148 页已转换为 2404 行 staging 数据，其中 2391 行仍为 `needs_review`，1447 行尚未匹配本地 ingredient；表 A.2、B.1、B.2、B.3、C.1、C.2、C.3、附录 D、E.1、附录 F 已转换为 2800 行 reference rows；100 条食品添加剂 seed 中有 A.1 证据的 91 条已全部覆盖，9 条无可结构化 A.1 证据，不能视为完整成分库或完整 GB 2760 法规库。
- 当前数据路线不是一次性补齐全部食品配料，而是“基础权威库 + 持续扩充 + 人工校验队列”：先把来源、状态、原文和低置信提示做实，再持续导入官方数据。
- 数据库已完成本地/开发环境 Drizzle schema、migration、seed 和只读 API 对接；生产数据库未完成，不能标记为生产数据库已完成。
- **OCR 是产品核心功能**；当前已完成拍照/上传、图片预处理、IndexedDB 图片存储、OCR real/manual/fallback 抽象、文本确认页、配料解析和数据库批量匹配。真实 OCR 供应商调用仍等待 OCR API Key，不能写成已接入真实识别。
- AI 只能做解释和总结，不能作为原始数据来源；任何未确认数据必须保留未验证标识。

| 里程碑 | 名称 | 状态 | 完成度 |
|---|---|---|---|
| M0 | 口径校准与开发规则 | ✅ 已完成 | 100% |
| M1 | 食品添加剂可信数据底座 | 🔄 进行中 | ~52% |
| M2 | 数据库真实对接与 API 查询（本地完成，生产待补） | 🔄 进行中 | ~65% |
| **M3** | **OCR 拍照识别产品闭环**（核心，前置） | **🔄 进行中** | **62%** |
| M4 | 配料解析 + 成分匹配 + 分析报告 | 🔄 进行中 | 60% |
| M5 | 产品档案、历史、个性化关注 | 🔄 进行中 | 45% |
| M6 | 移动端/PWA 体验 + AI 解释层 | 🔄 进行中 | 22% |
| M7 | 订阅、支付、上架、iOS/Android 签名 | ⏸ 后置 | 0% |

**当前瓶颈（P0）**：
1. 数据源准确性（GB 2760-2024 官方标准文本来源已确认；5 条 GB 2760 官方 PDF 条款级数据已导入正式库，官方 PDF 全 264 页逐页全文数据已具备入库通路，表 A.1 PDF 第 8-148 页已转换为 2404 行 staging 数据，参考表层已转换 2800 行，100 条 seed 中有 A.1 证据的 91 条已全部覆盖，27 条 JECFA 安全评价匹配，12 条普通配料词库，68 条仍未验证；GB 2760 staging 行仍待人工审核、去重/归并和正式库升级）
2. OCR 真实服务接入（manual/fallback 主路径已贯通，真实 OCR API Key 和供应商适配未完成）
3. 跨设备同步验收与离线队列（前端登录入口已完成；过敏原、关注成分、忌口项、收藏、历史、报告和产品档案已有基础同步；仍缺真实跨设备验收和离线队列）

**当前最早未完成任务**：见 [`CODEX_TASKS.md`](./CODEX_TASKS.md)
- 人工：继续确认 GB 2760-2024 条款、适用食品类别和限量；无法结构化时先保留 `rawSourceText`
- Codex 可立即执行：继续做官方数据导入、JECFA 映射、常见配料词库扩展、审核队列细化和数据可信等级展示；`Batch A-A：AI 解释层集成` 仍需要 AI API Key 人工前置

---

## 1. 项目最终目标

CompCheck（成分小查）的目标是完成一个可正式上线、可持续迭代、支持付费转化的成分查询与分析 App。产品最终形态必须同时覆盖 iOS、Android 和 Web/PWA，其中 iOS/Android 是上线主目标，Web 主要作为内容、账号、支持和早期验证入口。

### 1.1 产品定位

**CompLens / 成分镜 是一个面向普通用户的食品配料表拍照识别与成分分析 App。**

**核心用户流程**：

```
拍照/上传食品配料表图片
  → OCR 识别文字
  → 用户确认和修正识别文本
  → 自动拆分配料
  → 匹配食品成分/食品添加剂数据库
  → 标出重点关注项
  → 生成食品配料分析报告
  → 保存产品档案和分析历史
```

成分搜索是辅助功能，不是主路径。

当前阶段只做「食品配料 / 食品添加剂」，不混入化妆品、护肤品、药品方向。

| 类别 | 优先级 | 数据来源 | 标准依据 | 上线策略 |
|---|---|---|---|---|
| 食品添加剂 | **主线，优先实现** | GB 2760、Codex、EU E-number | GB 2760、EU 食品添加剂法规、FDA GRAS | MVP 必须可用 |
| 食品天然原料 | 第二阶段迭代 | 中国食物成分表、USDA | GB 2760、营养标签标准 | 食品添加剂 MVP 稳定后接入 |
| 营养成分 | 第三阶段迭代 | 中国食物成分表、USDA FoodData Central | GB 28050（营养标签）| 作为付费报告增强项 |
| 化妆品成分 | 后续迭代（不阻塞主线） | NMPA 已用原料目录、INCI | NMPA、EU 化妆品法规 Annex II/III | 不阻塞食品主线上线 |

### 1.2 核心能力

**主路径（OCR 拍照识别）**：
- 拍照 / 上传食品配料表图片，OCR 识别后进入文本确认页。
- 用户确认/修正文本后，自动拆分配料、匹配数据库成分。
- 生成食品配料分析报告：配料总数、已匹配/未匹配数量、食品添加剂列表、重点关注成分。
- 保存产品档案，管理分析历史，收藏关注成分或产品。

**辅助路径（成分搜索）**：
- 按名称、E-number、INS 编码搜索成分，展示来源标准、安全状态、使用限量、ADI 值。

**个性化功能**：
- 过敏原档案：用户录入个人过敏原，搜索/详情/分析报告中自动高亮警告。
- 关注成分/忌口项：用户自定义，报告中重点标注。
- 所有提示不构成医疗建议。

**基础设施**：
- 收藏、历史、用户设置本地持久化，并支持登录后云端同步。
- 免费版提供基础查询和基础分析，付费版解锁 OCR 额度、高级报告、跨端同步、导出和更多数据能力。
- 后端 API、数据库、OCR 代理、密钥管理、日志和限流。
- 数据采集、审核、版本管理、来源追踪和持续维护流程。
- 移动端优先 UI、PWA、iOS/Android 原生打包。

### 1.3 上线与商业化目标

| 目标 | 决策 | 原因 | 验收口径 |
|---|---|---|---|
| 平台 | iOS App Store、Google Play、Web/PWA | 用户明确要求 iOS/Android 都支持并上线 | TestFlight、Google Play 内测、生产发布均跑通 |
| 商业模式 | 建议默认采用免费 + Pro 订阅，不建议首版做纯付费下载 | 食品安全类工具需要先建立信任；免费入口利于获客，订阅适合 OCR、报告、同步等持续成本 | App 内购买/订阅可购买、可恢复、可取消、权益跨端一致 |
| 免费能力 | 基础搜索、基础详情、基础文本分析、过敏原本地提醒、有限历史和收藏 | 免费版必须能体现产品价值 | 新用户不用付费即可完成一次有效查询 |
| Pro 能力 | OCR 扫描额度、高级分析报告、历史报告、跨设备同步、导出/分享、离线数据包、更多类别数据 | 付费点绑定持续成本和高频价值 | 用户购买后可立即解锁，换设备后权益可恢复 |
| 合规边界 | 不把关键安全警告做成付费墙，不宣称诊断、治疗或替代专业建议 | 食品安全和过敏原信息有高误用风险 | 所有风险文案都有免责声明和来源边界 |

### 1.4 推荐技术路线

当前代码是静态 Web 原型。为兼顾迭代速度和 iOS/Android 上线，建议默认路线为：

| 层级 | 建议 | 当前状态 | 后续判断点 |
|---|---|---|---|
| 前端应用 | 先将现有 Web 原型迁移为标准 SPA 工程，再用 Capacitor 封装 iOS/Android | 已迁移到 Vite，并完成 Capacitor 基础配置 | 如果后续大量使用原生 UI/复杂动画，再评估 React Native 或 Flutter |
| 类型和构建 | Vite、模块化 API client，后续按需要评估 TypeScript | Vite 已完成基础迁移 | 数据 schema、支付权益和移动插件接入前应继续完善 |
| 移动能力 | Camera、文件选择、分享、深链、推送、权限说明、安全区适配 | 已完成 Camera/Share 基础适配与 Web 降级，深链/推送未开始 | OCR 和订阅上线前必须完成 |
| 本地数据 | IndexedDB 或 SQLite 封装，支持离线查询和同步队列 | 当前仅 localStorage | 数据量超过本地数组后必须切换 |
| 后端 | Node/TypeScript API + 数据库 + 对象存储 + 队列 | Hono/TypeScript API 骨架、食品添加剂 schema/seed、只读成分 API、基础账号鉴权和收藏/历史/过敏原/报告同步 API 已完成 | 订阅校验、OCR、AI 都依赖后端 |
| 付费权益 | 服务端统一校验 Apple/Google 票据，生成内部 entitlement | 未开始 | 不允许只在前端判断付费状态 |

### 1.5 外部平台约束

这些约束会影响技术排期，不能放到上线前才处理。

| 平台 | 约束 | 对项目的影响 | 参考 |
|---|---|---|---|
| Apple | 上架、TestFlight、数字商品和服务分发需要 Apple Developer Program；公开资料显示个人/组织开发者计划为 $99/年 | 需要开发者账号、证书、Bundle ID、App Store Connect、隐私信息、审核说明 | https://developer.apple.com/programs/ |
| Apple | App 内数字功能、内容和订阅通常要走 In-App Purchase；提交审核时 IAP 必须完整、可见、可测试 | 订阅、恢复购买、权益校验、审核 demo 账号必须在 M4 前完成 | https://developer.apple.com/app-store/review/guidelines/ |
| Google Play | Android 数字商品和订阅需要接 Google Play Billing，并建议服务端校验购买状态 | 需要 Play Billing、Google Play Developer API、实时订阅通知和后端权益同步 | https://developer.android.com/google/play/billing |
| Google Play | Google Play Console 开发者账号有一次性注册费；新个人开发者账号可能需要闭测门槛 | 需要提前准备测试用户池和 14 天闭测窗口，不能等发布当天才做 | https://support.google.com/googleplay/android-developer/answer/6112435 |

## 2. 当前阶段

当前阶段：OCR/解析/匹配主路径推进 / 可信食品添加剂数据底座 + 本地数据库真实对接闭环。

当前判断：项目已有 Web/PWA 原型、Vite 前端、Hono 后端、Drizzle/PostgreSQL schema、migration、seed、GB 2760 官方 PDF 全文页表、GB 2760 官方 PDF staging 表、GB 2760 官方 PDF reference rows 表、数据版本/审核状态字段、成分 API、账号/同步 API，以及 OCR manual/fallback 主路径、图片预处理、确认页、配料解析、批量匹配和 PWA 安装/离线基础体验。数据已转为 112 条基础权威库口径，其中 5 条为 GB 2760 官方 PDF 条款级法规数据、27 条为 JECFA 安全评价匹配、12 条为普通配料词库、68 条仍未验证；官方 PDF 全 264 页全文已可入库，表 A.1 PDF 第 8-148 页已转换为 2404 行 GB 2760 官方 PDF 行级 staging 数据，A.2/B/C/D/E/F 参考表已转换为 2800 行 reference rows，100 条 seed 中有 A.1 证据的 91 条已全部覆盖，不能视为完整成分库或可上线权威法规数据集。当前最重要的工作不是继续做订阅、支付、上架或 iOS/Android 签名，而是继续把可信数据、真实数据库、OCR 到分析报告的主路径做稳。

真实情况：

- 已有 `backend/` Hono/TypeScript API 骨架、健康检查、CORS、请求日志、全局 JSON 错误处理、Docker、Drizzle/PostgreSQL、只读成分 API、基础账号鉴权 API 和 Vitest 测试。
- 食品添加剂数据模型已补充 `sourceName`、`sourceType`、`sourceVersion`、`sourceUrl`、`effectiveDate`、`confidenceLevel`、`lastReviewedAt`、`regulatoryBasis`、`rawSourceText`、`isVerified`，前端类型、后端 schema、seed、API 返回和详情展示保持一致。
- 已新增本地/开发环境数据库迁移和 seed，食品基础库可以导入 PostgreSQL，并通过 `GET /api/ingredients`、`GET /api/ingredients/:id`、`GET /api/ingredients/categories`、`GET /api/ingredients/search?q=` 查询。
- 前端食品搜索和食品详情优先请求后端 API，Vite 本地开发代理 `/api` 到后端；后端不可用时降级本地 seed，并明确显示加载、错误、空态和未验证数据标识。
- 当前食品基础库中 5 条已按 GB 2760-2024 官方 PDF 表 A.1 标记为 `verified_regulation` / `isVerified: true`，27 条按 WHO JECFA 官方数据库标记为 `verified_jecfa`，12 条为 `common_ingredient`，68 条仍为 `unverified`。后端已新增 `gb2760_official_records` staging 表承接官方 PDF 行级抽取数据；JECFA-only、seed 记录和 `needs_review` staging 行仍不能展示为中国法规使用范围。
- 生产数据库未完成；当前仅完成本地数据库或开发环境数据库对接，不能写成“生产数据库已完成”。
- OCR 产品主路径已从占位推进到 manual/fallback 可用闭环；真实 OCR 供应商调用仍依赖 OCR API Key。AI 只能用于解释和总结，不能作为原始数据来源。
- 订阅、支付、上架、iOS/Android 签名暂停推进，保留已有代码和文档，不继续扩展。

## 3. 真实进度口径

本轮起按“数据源准确性、数据完整度、数据库真实对接优先”的口径计算进度。移动端工程、付费、OCR、AI、商店上架和运营仍会计入长期产品目标，但在可信数据底座完成前不再作为当前优先级。

整体产品进度：**57%**

2026-06-13 重新校准：当前主线为食品添加剂 / 食品成分方向。已完成数据溯源字段补齐、GB 2760-2024 官方标准文本来源确认、首批 5 条 GB 2760 官方 PDF 表 A.1 条款级数据导入、官方 PDF 全 264 页逐页全文转换和 `gb2760_official_pages` 入库通路、表 A.1 PDF 第 8-148 页到 2404 行 staging 数据的转换、`gb2760_official_records` 入库通路、A.2/B/C/D/E/F 参考表到 2800 行 reference rows 的转换和 `gb2760_official_reference_rows` 入库通路、100 条 seed 的 A.1 覆盖审计、官方 PDF 第 8-35 页人工抽取检查点、27 条 JECFA 安全评价匹配、本地数据未验证标识保留、12 条常见普通配料词库、数据状态分层、Drizzle schema/migration/seed、数据版本/审核状态字段、可信等级筛选 API、只读成分 API、搜索 API、批量匹配 API、前端 API 优先和本地降级、详情页来源与可信等级展示、数据校验脚本增强和质量报告、数据来源文档、OCR 未收录人工校验队列、OCR 拍照入口、图片预处理、IndexedDB 图片存储、OCR 抽象层、确认页、配料解析、数据库匹配、结构化食品配料分析报告、产品档案、分析历史列表、产品收藏管理、前端账号登录基础、个人关注/忌口本机档案高亮和登录态 profile 同步，以及 PWA 多尺寸图标、安装提示、离线状态提示和 service worker v24 缓存策略；但 GB 2760 staging 行尚未人工审核并升级到正式成分库，生产数据库、审核后台、发布流程、真实 OCR、真实 AI、真实跨设备验收、真机 PWA 安装验收和离线同步队列仍未完成。

## 4. 进度权重表

> 当前权重按数据底座优先重排。历史移动端、订阅、支付、OCR、AI、上架任务保留为长期路线，但本阶段暂停推进。

| 大项 | 权重 | 当前完成度 | 折算进度 | 当前证据 | 主要缺口 |
|---|---:|---:|---:|---|---|
| 数据源准确性 | 22% | 50% | 11.00% | 已建立 `verified_regulation` / `verified_jecfa` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 分层；GB 2760-2024 官方标准文本来源已确认到国家卫健委公告和食品安全国家标准数据检索平台；5 条官方 PDF 条款级数据已导入正式库，官方 PDF 全 264 页逐页全文、2404 行官方 PDF 表 A.1 staging 数据和 2800 行 reference rows 保留原文、页码和 hash，100 条 seed 中有 A.1 证据的 91 条已全部覆盖，27 条 JECFA 安全评价匹配，68 条仍未验证；不把 AI 输出当权威来源 | GB 2760 staging 行的人工审核、去重/归并、ingredient 匹配和正式库升级 |
| 数据完整度 | 18% | 45% | 8.10% | 当前覆盖 100 条食品添加剂 seed 和 12 条常见普通配料词库，其中 5 条已有 GB 2760 官方使用限量；官方 PDF 全 264 页已完成全文转换，表 A.1 PDF 第 8-148 页已转换为 2404 行 staging，其中 957 行按唯一名称/别名或单一 INS 码精确匹配关联 91 个添加剂 ID，1447 行尚未匹配本地 ingredient；A.2/B/C/D/E/F 参考表已转换为 2800 行 reference rows，覆盖 PDF 第 149-264 页参考表区域；100 条 seed 中有 A.1 证据的 91 条已全部覆盖，9 条无可结构化 A.1 证据；数据治理页已聚合 OCR 未收录、低置信候选和静态未验证数据，按官方数据导入 + 人工校验队列持续扩充 | GB 2760 staging 行人工审核、ADI 原文、过敏原和特殊人群审核 |
| 数据库真实对接 | 16% | 68% | 10.88% | Drizzle/PostgreSQL schema、migration、seed、数据版本/审核状态字段、官方 PDF 全文页表、官方 PDF staging 表、官方 reference rows 表、列表/详情/分类/search API、可信等级筛选、批量匹配 API 和本地数据库验证已完成 | 生产数据库、备份、数据发布流程、导入审计、运维监控 |
| 搜索和详情体验 | 12% | 55% | 6.60% | 前端食品搜索/详情优先请求后端 API，失败降级本地数据；详情页展示来源与可信等级，搜索结果标识未验证；`/data` 页支持来源和可信等级筛选；搜索/详情已接入过敏原、关注成分和忌口项高亮 | 大数据量索引、审核后台、浏览器 E2E |
| 成分表文本分析 | 10% | 72% | 7.20% | `parseIngredientList` 支持 OCR 噪声修正、复配括号、E-number、顺序、去重、未知项保留；分析页展示数据库匹配摘要、低置信和未匹配项；报告页已结构化展示整体评级、关注摘要、个人命中摘要、配料顺序、添加剂分类和来源说明 | 更多真实包装格式、浏览器 E2E、PDF/图片导出 |
| OCR 识别 | 6% | 47% | 2.82% | 拍照/相册入口、图片预处理、IndexedDB 存图、OCR real/manual/fallback 抽象、确认页、后端 `/api/ocr` 无 Key 降级和 OCR 未收录项队列入口已完成 | OCR API Key、供应商适配、真实识别、额度/限流、真机验收 |
| AI 总结 | 6% | 0% | 0.00% | 当前仅保留已有协议和本地降级，不作为数据来源 | 暂缓；只能做解释/总结，不能生成权威来源 |
| 订阅、支付、上架、iOS/Android 签名 | 10% | 0% | 0.00% | 已有部分页面和 Capacitor 基座，但本阶段暂停，不计入当前完成 | 商店账号、IAP/Billing、签名、真机、审核、生产发布 |

折算结果约 45.00%，考虑已有账号同步、前端登录入口、移动端基座、结构化报告详情、OCR manual/fallback 主路径、OCR 未收录人工校验队列入口、产品档案/历史收藏闭环、个人档案高亮和关注/忌口登录态同步、首页/导航设计系统起步、PWA 安装/离线基础体验、数据版本/审核状态基础设施、GB 2760-2024 官方标准文本来源确认、首批 5 条 GB 2760 条款级数据、官方 PDF 全 264 页全文数据、2404 行官方 PDF staging 数据、2800 行 reference rows、100 条 seed 的 A.1 覆盖审计、27 条 JECFA reviewed 数据和测试基础，当前按 **57%** 记录。

## 5. 已实现与待实现总表

| 模块 | 当前状态 | 模块完成度 | 已实现 | 需要实现 | 真实评价 |
|---|---|---:|---|---|---|
| 项目结构 | 部分完成 | 38% | `src/components`、`src/pages`、`src/router`、`src/services`、`src/store`、`src/data`、`src/utils` 已建立，Vite 配置和 `public/` 静态资源目录已接入；`backend/` 已初始化 Hono/TypeScript API、Drizzle schema、migration、seed、route/service 工程、账号鉴权和用户同步接口 | API client、移动端平台工程、平台能力封装 | 能继续验证业务并已有标准前端构建、后端骨架、成分 API、账号 API 和同步 API，但还不是移动端可上线工程 |
| 开发脚本 | 基础完成 | 69% | `npm run dev`、`npm run build`、`npm run preview`、`npm run lint`、`npm run test`、`npm run validate:data`、`npm run cap:sync`、`npm run cap:open:ios`、`npm run cap:open:android` 已配置；`backend/` 已有 `dev`、`typecheck`、`test`、`build`、`db:generate`、`db:migrate`、`db:seed` 和 Docker Compose 命令，CI 会执行前端和后端基础校验 | 覆盖率、发布流水线、移动端真机脚本 | 本地、PR、Capacitor 同步、后端 API、鉴权/同步 API 和数据库基础校验命令可控，但还不覆盖真机和发布 |
| **多类别路由与导航** | **基础完成** | **38%** | 支持 `/food/...`、`/cosmetics/...` 路由、首页类别切换、旧路径兼容、类别感知收藏、类别感知顶部/底部导航、历史页导航 active 态、基础 404、页面标题和路由切换焦点管理 | 面包屑、更多参数边界 | 基础路由可用，新增历史入口后更贴近产品主路径，但还不是完整多类别架构 |
| 首页 | 基础完成（移动信息架构起步） | 34% | 搜索入口、扫描入口、分析入口、收藏入口、历史、分类入口、首次设置提示、食品/化妆品类别切换；食品首页已有热门种子数据入口、数据状态摘要、最近分析产品缩略图入口、成分镜 appbar、全宽拍照识别 CTA、独立成分搜索分区和热门类别分区 | 免费/Pro 价值展示、真实热门内容、真机视觉验收 | 食品类别可展示草稿数据状态、本机档案入口和更清晰的拍照识别主路径，但仍不是正式内容规模 |
| 路由 | 基础完成（已扩展） | 74% | hash 路由支持首页、搜索、扫描、首次设置、账号登录、成分对比、会员中心、详情、分析、报告列表/详情、产品档案、分析历史、收藏、设置、基础 404，并支持 `/login`、`/food/login`、`/food` 和 `/cosmetics` 前缀；报告详情兼容 `/reports/:id` 和 `/report/:id`；路由切换同步 `document.title`，顶部导航根据类别更新链接和 active 态 | 更完整的参数边界、面包屑 | 类别层级、扫描/分析分层、首次设置、账号登录、成分对比、会员中心、报告和历史路由已加，仍未到完整路由系统 |
| 成分搜索 | 原型完成（逻辑可复用） | 49% | 中文名、英文名、别名、拼音、首字母、常见误写、近似纠错、分类、描述和食品 E-number/INS 编码本地搜索，支持按类别切换数据集、搜索建议、搜索结果分页、搜索结果排序、风险分布筛选、分类分布筛选、首页分类筛选入口、搜索无结果热门分类入口、搜索结果加入对比，并支持风险等级和成分分类组合筛选；食品搜索页显示草稿数据审核状态、“可能相关”候选和个人命中 badge | 大规模索引、真实搜索日志召回评估、更多食品数据搜索样例、移动端筛选交互 | 算法可复用，食品数据仍是草稿库 |
| 成分详情 | 原型完成（食品字段基础接入） | 33% | 展示名称、英文名、别名、功能、风险说明、收藏按钮、加入对比按钮和分享按钮；食品详情页已展示 E-number、INS、ADI、适用食品类别、GB 状态、草稿状态、来源链接、草稿审核提示、个人命中 banner 和相关成分推荐，功能分类芯片可跳转到搜索筛选或关键词搜索，并可一键带入数据纠错反馈草稿；缺失成分 ID 会进入暂未收录友好页并带搜索和数据纠错预填入口 | 精确使用限量、字段解释、来源可信度标识、相关产品、来源可信度说明 | 食品字段、基础关联推荐、详情页横向浏览入口、分享入口、个人提醒和纠错入口已有展示，但还不是完整法规详情页 |
| **食品添加剂数据** | **基础权威库已起步，内容审核未完成** | **60%** | 已定义食品数据分层字段，`src/data/foodAdditives.js` + `src/data/commonFoodIngredients.js` 合计 112 条；GB 2760-2024 官方标准文本来源已确认并写入 seed 元数据；5 条为 `verified_regulation`，27 条为 `verified_jecfa`，12 条为 `common_ingredient`，68 条为 `unverified`；新增 `src/data/gb2760OfficialFullText.js` / `gb2760_official_pages` 保存官方 PDF 全 264 页逐页全文，新增 `src/data/gb2760OfficialGeneratedA1Staging.js` / `src/data/gb2760OfficialStaging.js` / `gb2760_official_records` 保存 2404 行官方 PDF 表 A.1 staging 数据，新增 `src/data/gb2760OfficialReferenceTables.js` / `gb2760_official_reference_rows` 保存 2800 行官方 PDF reference rows；100 条 seed 中有 A.1 证据的 91 条已全部覆盖；`npm run validate:data` 输出质量报告；来源/版本聚合、数据来源与审核状态页、人工校验队列已同步 | GB 2760 staging 行人工审核、E-number 对照审核、ADI 原文核验、真实过敏原标注审核、完整审核后台 | **主线核心已建立基础权威库结构、官方标准来源、首批条款级数据、官方 PDF 全文层、结构化 staging 层和参考表层，但还不是可正式上线的完整法规数据集** |
| **个人成分档案** | **基础完成，登录态同步起步** | **48%** | 已定义 EU 14 类标准过敏原枚举 `src/data/allergens.js`，提供 `getUserAllergens()` / `setUserAllergens(ids)`；新增 `personalProfileService` 整合过敏原、关注成分和忌口项，设置页支持三类可折叠区块、搜索添加、chip 删除、本机导入/导出/清空；后端已提供 `/api/user/allergens` 和 `/api/user/profile/:kind`，过敏原、关注成分和忌口项可登录态同步 | 更多地区标准映射、真实跨设备验收、离线队列 | 单机三类个人档案可用；登录态同步已有基础接口和前端自动同步触发，但仍需真实跨设备验收 |
| **个性化全局高亮** | **基础逻辑完成，真实数据待审核** | **14%** | 搜索结果、详情页、报告详情已接入过敏原 > 忌口项 > 关注成分优先级高亮；报告页新增个人命中摘要；关注/忌口项已接入登录态 profile 同步；食品基础库中已草稿标注大豆/乳/蛋/亚硫酸盐相关项 | 食品数据 `allergenTypes` 逐条审核、视觉验收、真实跨设备验收 | 逻辑已接入，但标注仍是草稿级别，真实跨设备和离线队列仍未验收 |
| 成分表文本分析 | 基础完成（OCR 文本解析、匹配和报告页起步） | 70% | `parseIngredientList` 输出结构化配料项，支持 OCR 中文空格/换行噪声修正、`配料：` 等前缀、复配添加剂括号展开、剂量/百分比后缀清理、E-number 提取、顺序保留、重复标记、未知项保留；分析页展示数据库匹配摘要、低置信和未匹配项；报告详情页展示整体评级、关注摘要、配料顺序说明、添加剂列表、未收录项、特殊人群提示和来源说明 | 更多真实包装格式、复合原料归类、置信度校准、浏览器 E2E | 已能完成确认文本到数据库匹配和结构化报告展示的基础闭环，但仍不是生产级解析器 |
| 图片 OCR | manual/fallback 主路径完成，真实识别未接入 | 47% | 独立扫描页支持拍照/相册、Web 文件选择降级、8 MB 校验、图片预处理、EXIF 修正、压缩、IndexedDB 存图、OCR real/manual/fallback 抽象、后端 `/api/ocr` 鉴权占位、无 Key 503 降级、确认页编辑、产品名称字段和 OCR 来源报告未收录项队列入口 | OCR API Key、供应商适配、真实识别、裁剪、重试、额度/限流、真机验收 | 用户可在无 Key 情况下完成拍照/手动确认/解析/匹配主路径，未收录项能进入人工校验队列，但真实 OCR 识别仍未完成 |
| AI 分析 | 协议和本地降级起步 | 6% | `aiAnalysisService` 已定义协议版本、endpoint 占位、请求 payload、输出 contract、响应校验和本地 fallback；分析页可展示 AI 协议状态与本地 fallback 解读 | 后端代理、模型调用、服务端鉴权、成本控制、真实 AI 输出验收 | 没有真实 AI 调用，但已经有可接入的结构化协议和可见降级体验 |
| 收藏 | 基础完成，登录态同步起步 | 52% | localStorage 成分收藏、取消收藏、详情页按钮、收藏页展示、收藏页空态搜索入口、收藏页内联取消、收藏页加入对比、类别感知收藏记录；收藏页新增“收藏产品”Tab，展示产品缩略图、名称、评级和日期；后端已提供 `/api/user/favorites`，前端登录后会触发登录态同步并保持未登录本地行为 | 批量管理、离线同步队列、真实跨设备验收 | 单机成分/产品收藏流程可用，已有前端账号入口和登录态云同步触发，但还缺跨设备验收 |
| 成分对比 | 基础完成 | 23% | localStorage 保存同类别最多 4 个对比项，搜索结果、详情页和收藏页可加入对比，`/compare` 展示关注等级、分类、功能、提醒、过敏原、食品编码、GB 状态和数据状态，支持移出、清空、空状态、移动端横向表格、原生分享 / Web Share / 复制 fallback | 拖拽排序、云同步、真实移动端截图验收 | 已完成单机可验证用户流程和基础分享，但还不是跨端或 Pro 级对比能力 |
| 搜索历史 | 基础完成，登录态同步起步 | 46% | localStorage 保存最近 8 条、首页展示、清空、单条删除；设置页可关闭自动记录，关闭后首页展示隐私提示，导出/导入会保留该偏好；后端已提供 `/api/user/history`，前端登录后会触发登录态同步 | 隐私开关更细分、离线同步队列、真实跨设备验收 | 单机基础能力已做，并已有前端登录入口和登录态云同步触发 |
| 移动端 App 基座 | Web Shell + Capacitor 原生适配起步 | 36% | 已新增 Vite 前端工程化基座、Capacitor 依赖、`capacitor.config.json`、`cap:sync` / `cap:open:*` 命令、Camera/Filesystem/Share 插件、原生相机/相册入口、原生分享入口、Web 降级、viewport-fit、safe-area bottom、safe-area top、iOS 权限描述文档、Web 小屏底部主导航（首页/识别/搜索/历史/我的）、类别感知移动链接、扫描页和历史页 active 态、底部导航保留 link 语义并用 `aria-current` 标识 active、突出识别入口、首次启动引导页、成分对比移动端布局、会员中心移动端单列样式、PWA manifest 多尺寸 PNG 图标、安装快捷方式、全局离线提示、安装提示和 service worker v24 离线策略；install 阶段会预热 Vite JS/CSS bundles，登录态 API 不进入 Cache Storage | iOS/Android 工程人工签名配置、原生启动屏、权限恢复页、深链、推送、真机安装验收、Lighthouse PWA 验收 | 已完成 Capacitor 可同步脚手架、基础原生能力适配、移动 Web Shell 和 PWA 安装/离线基础，但还不是已真机验收的原生 App |
| 账号系统 | 前后端基础完成，跨设备验收未完成 | 38% | 后端已完成邮箱注册、登录、JWT Bearer 鉴权、退出、`me`、账号删除、服务端 session 失效，并为收藏/历史/过敏原/报告同步接口复用鉴权；前端新增登录/注册页、JWT 过期清理、设置页登录/退出入口、访客模式和登录后本机数据同步触发 | 刷新 token、匿名升级、第三方登录、账号隐私导出、真实跨设备验收 | 用户已能在前端完成注册/登录/退出并触发云同步基础链路，但还不是完整账号体系 |
| 付费订阅与权益 | 前端信息架构起步 | 3% | 已有会员中心页面、Free/Pro 套餐说明、本机用量、恢复购买/管理订阅未接入提示和支持中心入口，并明确真实权益需要商店票据和服务端校验 | Apple IAP、Google Play Billing、真实恢复购买、订阅状态同步、服务端 entitlement、付费墙 | 只完成前端说明、客服入口和边界提示，不能视为真实付费能力 |
| 报告与同步 | 本地报告闭环，登录态同步起步 | 50% | localStorage 保存分析报告快照，支持报告列表、结构化详情、删除、清空、关键词检索、重新分析、类别隔离、整体风险评级、关注摘要、个人命中摘要、配料顺序说明、添加剂分类统计、未收录项、特殊人群提示、来源说明、复制 Markdown、下载 Markdown、下载 JSON、原生分享 / Web Share / 复制 fallback，并可随本机数据快照整体导出、导入或清空；后端已提供 `/api/user/reports`，前端登录后会触发登录态同步 | 离线同步队列、PDF/图片导出、原生文件持久化、真实跨设备验收 | 已完成单机结构化报告闭环和前端登录态同步触发，但还不是 Pro 级报告系统 |
| 产品档案与分析历史 | 基础完成，登录态同步起步 | 48% | 报告可保存为产品档案，完整图片保留 IndexedDB，localStorage 只保存 `imageId`、元数据和小缩略图；新增 `/products`、`/product/:id` 和 `/history`，历史页支持搜索、全部/收藏/高关注筛选、最多显示 50 条、清空和移动端左滑删除；首页展示最近分析产品，收藏页新增收藏产品 Tab；后端已提供 `/api/user/products`，前端登录后会触发产品档案元数据同步 | 真实跨设备验收、生产 CDN 图片存储、离线同步队列、真机图片读取和滑动手势验收 | 单机产品档案和历史回看闭环可用，已有前端登录态同步触发；跨设备和生产图片存储仍未完成 |
| 化妆品成分模块 | 原型（待多类别改造） | 10% | 原有原型结构可复用 | 分离为 `/cosmetics/` 类别、化妆品专用数据和字段 | 后续迭代 |
| UI 样式 | 部分完成 | 37% | `src/styles.css` 有基础视觉、响应式样式、首次启动引导样式、登录/注册表单、成分对比卡片/表格/移动端样式、会员中心套餐/用量移动端样式、个人 badge/banner、报告评级卡片/成分条目样式、历史卡片左滑删除样式、移动端底部主导航、设计系统变量、skeleton、统一页面级 empty/error 状态、页面进入动画、离线横幅、安装提示、iOS `100dvh` 和输入框 16px zoom 修复 | 小屏真机验收、设计走查、更多字段级状态治理 | 看起来有雏形，并已补基础状态组件和 PWA 状态提示，但还未真机验收 |
| 可访问性 | 很早期 | 12% | 部分表单有 label，SPA 路由切换后可将焦点移到主内容区；移动底部导航保留 `nav` + link 语义，并通过 `aria-current="page"` 标识当前入口；首页设置入口有 `aria-label`，错误状态提供重试按钮 | 系统键盘导航、焦点状态细化、ARIA、过敏原警告可访问性、动态字体适配、axe 检查 | 已补部分移动导航语义，但还没有系统无障碍验收 |
| 安全 | 基础起步 | 18% | 没有前端写死 API Key，HTML 输出有基础转义；后端已支持 JWT Bearer 鉴权、服务端 session 失效、账号删除和登录态用户数据接口鉴权；前端会解析 JWT `exp` 并在过期时清理本地 token/user | CSP、依赖审计、输入限制、限流、审计日志、刷新 token、细粒度权限边界 | 已有基础鉴权和用户数据边界，但距离生产安全仍很早 |
| 测试 | 基础覆盖扩展中 | 67% | 函数断言覆盖搜索、解析、OCR 确认页、图片处理/IndexedDB 降级、批量匹配、数据库匹配摘要、个人关注/忌口存储、登录态 profile 同步与全局高亮、报告评级/详情/导出/分享、产品档案、分析历史、收藏产品 Tab、首页最近分析、登录/注册页渲染、JWT 过期清理、退出登录、本机数据登录态同步、移动端扫描入口、AI/OCR 协议/fallback；后端 Vitest 覆盖 health、CORS、404、500 JSON、ingredients API、batch-search、OCR 无 Key 降级、auth API、user sync/profile API 和 JWT middleware；已有 CI 工作流 | E2E、浏览器验收、移动端真机、支付沙盒、覆盖率 | 单元/结构测试覆盖继续增强，但仍不能替代真机和浏览器 E2E |
| 后端 | 成分 API、OCR 占位、基础鉴权和用户同步完成 | 47% | `backend/` 已有 Node.js 20 + TypeScript + Hono 工程、`GET /health`、CORS、请求日志、全局 JSON 错误处理、`.env.example`、Dockerfile、PostgreSQL 15 compose、Drizzle schema、迁移、100 条 seed、`/api/ingredients` 列表/分类/详情/search/batch-search API、`/api/ocr` 鉴权占位和无 Key/供应商未接入降级、`/api/auth/*`、`/api/user/*` 收藏/历史/过敏原/报告/产品/profile 同步 API、Vitest 测试和 CI 后端校验 | 真实 OCR/AI 供应商代理、任务队列、缓存、日志结构化、限流、支付回调、生产部署 | 正式产品已有成分 API、批量匹配、账号底座、用户同步和 OCR 安全占位，但付费、真实 OCR/AI 和生产安全仍未完成 |
| 部署与上架 | 未开始 | 0% | 无 | Web 生产部署、iOS/Android 构建、TestFlight、Google Play 内测、商店资料、灰度发布、回滚 | 不能上线 |
| 合规与内容治理 | 很早期 | 20% | README 有克制表达要求，首次启动引导有数据草稿和使用边界确认，分析页有基础免责声明，会员中心说明订阅和权益未接入且不能模拟购买成功并可进入支持中心，支持中心有本机反馈记录和预填数据纠错草稿，数据来源与审核状态页，隐私与条款中心提供隐私政策、服务条款、订阅说明、数据安全和内容来源草案，设置页提供本机数据导出、导入、清空、搜索历史记录关闭、对比列表清理和本机反馈记录 | 正式隐私政策、正式服务条款、平台数据安全表、正式客服渠道、账号删除、数据授权、内容审核 | 上线前必须补正式政策、平台资料和法务复核 |
| 运营维护 | 未开始 | 0% | 无 | 数据后台、数据更新 SOP、监控、用户反馈、订阅指标、客服流程 | 无长期维护能力 |

## 6. 功能级详细清单

### 6.1 前端页面

| 功能项 | 状态 | 已实现 | 还需要实现 | 证据 |
|---|---|---|---|---|
| 首页搜索框 | 基础实现 | 可输入关键词并跳转搜索页，聚焦/输入时显示热门和匹配建议 | 空输入提示、拼音/纠错、埋点 | `src/pages/homePage.js`、`src/main.js` |
| 首页热门成分 | 已实现原型 | 展示 `popularIngredientIds` 对应卡片 | 后台配置、真实热度、运营排序 | `src/data/ingredients.js` |
| 首页最近查询/分析 | 基础实现 | 展示 localStorage 搜索历史并可清空或单条删除；首页已有本地报告入口、首次设置入口和数量提示；有产品档案时展示最近分析产品缩略图、日期和“查看全部历史”入口 | 隐私异常提示、移动端视觉验收 | `src/store/userStore.js`、`src/pages/homePage.js`、`src/services/productArchiveService.js` |
| 首页分类入口 | 基础实现 | 从本地数据生成分类摘要，展示分类数量，并跳转到搜索页 `ingredientCategory` 筛选 | 分类体系、运营排序、移动端视觉验收 | `src/pages/homePage.js`、`src/services/ingredientService.js` |
| 数据审核状态摘要 | 基础实现 | 食品首页展示草稿数量、分类数、已复核/验证数和限量覆盖；食品搜索页和详情页显示草稿审核提示；独立数据页展示来源清单、版本、审核状态、可信等级统计、待审核比例和分类覆盖；后端保留 `reviewed_by`、`reviewed_at`、`change_note`；详情页和数据页可带入数据纠错反馈草稿，保存后清理预填 query | 审核后台、逐条条款状态、正式数据版本发布流程 | `backend/src/db/schema.ts`、`backend/src/routes/ingredients.ts`、`backend/scripts/seed.ts`、`src/services/ingredientService.js`、`src/pages/homePage.js`、`src/pages/searchPage.js`、`src/pages/detailPage.js`、`src/pages/dataPage.js`、`src/main.js`、`src/services/supportService.js`、`scripts/test.mjs` |
| 数据来源与审核页 | 基础完成 | `/data` 路由展示来源覆盖、限量覆盖、审核状态、可信等级、数据版本、来源清单、分类覆盖和上线前缺口；支持按 `sourceName` 和 `confidenceLevel` 筛选；首页数据状态卡片可跳转；可一键进入支持中心并预填数据集纠错反馈 | 来源条款逐条编号、数据版本发布记录、后台审核流 | `src/pages/dataPage.js`、`src/router/router.js`、`src/services/ingredientService.js`、`src/services/supportService.js`、`scripts/test.mjs` |
| 隐私与条款中心 | 草案入口完成 | `/legal` 展示隐私政策、服务条款、订阅说明、数据安全和内容来源说明草案；设置页、会员中心、支持中心和页脚可进入对应材料，页脚入口会跟随当前食品/化妆品类别；未知文档 ID 进入 404 | 法务复核、平台隐私表/数据安全表对齐、真实 SDK/后端/支付/客服接入后更新 | `src/data/legalContent.js`、`src/pages/legalPage.js`、`src/router/router.js`、`src/main.js`、`src/pages/settingsPage.js`、`src/pages/membershipPage.js`、`src/pages/supportPage.js`、`scripts/test.mjs` |
| 搜索页 | 基础实现 | 展示结果数量、列表、无结果提示，支持按关注等级和成分分类筛选，根据输入展示匹配建议，并通过 `page` 参数分页展示结果，支持默认、关注等级优先和中文名排序，结果区展示风险分布和分类分布并可快速切换筛选；无结果时展示热门分类入口；食品类别显示草稿数据审核状态；搜索结果可加入成分对比 | 拼音/错别字纠错、排序解释增强、真实数据规模下的筛选性能 | `src/pages/searchPage.js`、`src/services/ingredientService.js` |
| 详情页 | 已实现原型 | 展示成分基础信息、收藏按钮、加入对比按钮、相关成分推荐，并支持点击功能分类芯片继续搜索或筛选；食品详情显示草稿审核提示，可带入当前成分数据纠错反馈草稿；缺失成分 ID 展示暂未收录页、搜索入口和纠错反馈入口 | 更完整法规说明、相关产品、来源可信度说明、正式纠错处理状态 | `src/pages/detailPage.js`、`src/services/ingredientService.js`、`src/services/supportService.js` |
| 分析页 | 已实现原型 | 粘贴文本后显示匹配、未知、重点关注、AI 协议状态和本地 fallback 解读，并可保存本地报告；空输入提交会提示“请先输入成分表文字”且不进入分析 | 复杂解析、可编辑识别结果、原生分享、真实 AI 结果展示 | `src/pages/analyzePage.js` |
| 收藏页 | 基础实现 | 展示已收藏成分，空状态引导去当前类别搜索页，支持内联取消收藏，并可从收藏卡片加入对比；新增“收藏产品”Tab，展示已收藏产品的缩略图、名称、评级和日期；底层 storageService 登录态可同步 `/api/user/favorites` | 排序、批量管理、离线同步队列、跨设备验收 | `src/pages/favoritesPage.js`、`src/services/storageService.js`、`backend/src/routes/user.ts` |
| 404/异常页 | 基础完成 | 未知 hash 路由渲染 404 页面，提供返回当前类别首页和搜索入口 | 异常边界、数据加载失败页、浏览器验收 | `src/pages/notFoundPage.js`、`src/router/router.js`、`scripts/test.mjs` |
| 路由切换页面标题更新 | 基础完成 | 每次路由渲染时更新 `document.title`，搜索页标题包含查询词，详情页标题包含具体成分名 | 浏览器验收 | `src/router/router.js`、`src/main.js`、`scripts/test.mjs` |
| SPA 路由焦点管理 | 基础完成 | 路由切换后将焦点移到主内容区，辅助屏幕阅读器感知页面变化 | 复杂交互焦点恢复、键盘导航验收 | `src/index.html`、`src/main.js` |
| 搜索结果分页 | 基础实现 | 搜索页按每页 6 条展示结果，分页链接保留关键词和筛选条件，非法页码回落到第一页 | 浏览器交互验收、移动端手势体验 | `src/pages/searchPage.js`、`src/router/router.js`、`scripts/test.mjs` |
| 移动端首页/底部导航 | 基础实现 | Web 小屏底部导航包含首页、扫描、搜索、历史、我的五个主入口，并复用当前类别路由和 active 态；扫描入口已指向独立扫描页，历史入口已指向分析历史页；已补 `viewport-fit=cover` 和 safe-area bottom 兜底 | 真机验收、图标、手势返回、原生安全区细化 | `src/index.html`、`src/router/router.js`、`src/main.js`、`src/styles.css`、`scripts/test.mjs` |
| PWA/移动安装元数据 | 基础增强 | 已添加 manifest、theme color、iOS Web App meta、viewport-fit、SVG 应用图标、72-512 多尺寸 PNG 图标、扫描/搜索快捷方式、service worker 注册、Vite public 静态资源、运行时缓存、Vite JS/CSS 预缓存、运行时 HTML 更新前 bundle 缓存、图片/图标 shell cache 回退、离线首页回退、全局离线横幅、安装提示、顶部 safe-area 补偿、离线横幅/header 遮挡修复和设置页离线能力说明；登录态 API 不缓存 | 真机安装验收、Lighthouse PWA 检查、商店素材、离线浏览器验收 | `src/index.html`、`public/manifest.webmanifest`、`public/app-icon.svg`、`public/icons/`、`src/main.js`、`public/sw.js`、`src/pages/settingsPage.js`、`docs/pwa-offline-capability.md`、`scripts/test.mjs` |
| 首次启动引导 | 基础完成 | 新增 `/onboarding` 路由，无 hash 首次进入会导向食品首次设置；首页未完成时展示设置入口；引导页支持选择默认类别、过敏原、搜索历史记录偏好、使用边界确认和跳过；状态随本机数据快照导出/导入，清空本机数据会重置引导 | 相机权限解释、付费权益说明、浏览器/真机视觉验收 | `src/pages/onboardingPage.js`、`src/store/userStore.js`、`src/router/router.js`、`src/main.js`、`src/pages/homePage.js`、`scripts/test.mjs` |
| 扫描页 | 基础完成（manual/fallback 主路径完成，真实 OCR 未接入） | 首页突出拍照识别主入口；独立 `/scan` 页面支持拍照、相册、Web 文件选择降级、图片类型和大小校验、图片预览、图片预处理、EXIF 修正、压缩、IndexedDB 存图、重选图片、拍摄技巧、OCR real/manual/fallback 抽象，并在确认页编辑文本后进入分析 | 真实 OCR、图片裁剪、重试、权限恢复、真机验收 | `src/pages/scanPage.js`、`src/pages/ocrConfirmPage.js`、`src/services/nativeBridgeService.js`、`src/services/imageStoreService.js`、`src/utils/imageProcessor.js`、`src/router/router.js`、`src/main.js`、`src/store/userStore.js`、`src/utils/imageFile.js`、`src/services/ocrService.js`、`scripts/test.mjs` |
| 分析报告页 | 基础实现，登录态同步起步 | 支持本地报告列表、详情、关键词检索、删除、清空、重新分析、类别隔离、风险/过敏原/数据边界/下一步建议解读区块、来源引用与草稿审核状态、Markdown 复制、Markdown 下载、JSON 下载和原生分享 / Web Share / 复制 fallback；报告详情可保存/查看产品档案；底层 storageService 登录态可同步 `/api/user/reports` | PDF/图片导出、原生文件导出、离线同步队列、跨设备验收 | `src/pages/reportsPage.js`、`src/pages/reportDetailPage.js`、`src/store/userStore.js`、`src/services/storageService.js`、`src/services/reportExportService.js`、`src/services/shareService.js`、`src/services/nativeBridgeService.js`、`backend/src/routes/user.ts` |
| 产品档案页 | 基础实现，登录态同步起步 | 新增 `/products` 列表和 `/product/:id` 详情；报告可建档并关联产品，列表展示产品名、品牌、缩略图、评级、分析日期和收藏状态；完整图片保留在 IndexedDB，localStorage 只保存 `imageId`、元数据和小缩略图；本机数据导出/导入/清空包含产品档案；后端新增 `product_archives` 表和 `/api/user/products` CRUD/搜索/过滤 API | 跨设备真实同步验收、生产 CDN 图片存储、真机图片读取验收 | `src/services/productArchiveService.js`、`src/pages/productArchivePage.js`、`src/pages/reportDetailPage.js`、`src/router/router.js`、`src/main.js`、`backend/src/db/schema.ts`、`backend/src/routes/user.ts` |
| 分析历史页 | 基础实现 | 新增 `/history` 和兼容 `#/history`；按产品档案展示缩略图、产品名、评级、日期、配料数和需关注数；支持产品名/配料搜索、全部/收藏/高关注 Tab、清空全部、移动端左滑删除和空态“去拍照识别”；UI 最多展示 50 条 | 真机滑动手势验收、离线同步队列、跨设备历史恢复 | `src/pages/historyPage.js`、`src/router/router.js`、`src/main.js`、`src/styles.css`、`scripts/test.mjs` |
| 成分对比页 | 基础完成 | `/compare` 展示同类别本机对比列表和横向对比表，支持搜索/详情/收藏加入、移出、清空、数量上限、空状态、单项提示和食品数据状态展示 | 拖拽排序、对比分享、云同步、真机视觉验收 | `src/pages/comparePage.js`、`src/services/compareService.js`、`src/store/userStore.js`、`src/router/router.js`、`scripts/test.mjs` |
| 会员中心 | 基础前端完成（真实支付未接入） | `/membership` 展示当前 Free 套餐、Pro 规划、本机用量、购买/恢复/管理/客服未开放提示；设置页提供会员中心入口，移动端归入“我的”入口；PWA shell 已缓存会员页面和服务模块 | 真实续费状态、订单/发票、客服入口、账号恢复购买、服务端 entitlement | `src/pages/membershipPage.js`、`src/services/membershipService.js`、`src/data/membershipPlans.js`、`src/router/router.js`、`src/pages/settingsPage.js`、`scripts/test.mjs` |
| 付费墙 | 未开始 | 无 | 免费额度触发、套餐对比、权益解释、价格、本地化文案、恢复购买 | 不应阻塞第一次基础查询 |

### 6.2 数据和内容

#### 通用字段（食品 + 化妆品共用）

| 功能项 | 状态 | 已实现 | 还需要实现 | 真实评价 |
|---|---|---|---|---|
| 成分基础字段 | 部分实现 | id、中文名、英文名、别名、分类、功能、描述、风险等级、适用提醒；`FoodAdditive` 已包含来源、更新时间、审核状态、版本号、类别标识 | 真实食品数据填充、化妆品数据后续迁移到统一字段 | schema 已起步，数据仍不足 |
| **过敏原字段** | **schema 已完成，种子数据草稿标注** | `AllergenType` 枚举和 `FoodAdditive.allergenTypes` 字段已定义；100 条种子数据中已标注卵磷脂和亚硫酸盐相关项 | MVP 食品数据逐条审核真实过敏原 | 字段已可用，标注仍需审核 |
| **特殊人群禁忌字段** | **schema 已完成，种子数据草稿标注** | `ConsumerGroup` 枚举和 `FoodAdditive.cautionGroups` 字段已定义；部分种子数据已标注儿童、孕妇、肾病、敏感人群等提醒 | 真实食品数据逐条审核孕妇、婴幼儿、糖尿病等适用提醒 | 字段已可用，标注仍需审核 |
| 数据来源追溯 | 基础展示完成 | 食品基础库含国家卫健委公告（2024年第1号）、食品安全国家标准数据检索平台 GB 2760-2024 标准文本记录、官方 PDF 文件 hash、Codex INS、JECFA、EU 数据库来源链接和检索日期；5 条记录已追溯到 GB 2760 官方 PDF 表 A.1 页码和使用限量，官方 PDF 全 264 页逐页全文记录保留页文本和页 hash，2404 行官方 PDF staging 记录保留页码、标准页码、原文、附件 ID 和 hash，100 条 seed 中有 A.1 证据的 91 条已全部覆盖，32 条记录已指向 JECFA 具体条目 URL，12 条普通配料标记为内部样例词库；数据页聚合展示来源、地区、检索日期、引用记录数和数据状态 | 每条法规数据可追溯到具体 GB 2760 标准条目、适用食品类别和限量 | 目前已有官方 PDF 全文层、首批 5 条 GB 2760 条款级数据和表 A.1 全页 staging 入库层，仍缺 staging 人工审核和正式库升级 |
| 数据维护工具 | 部分完成 | `npm run validate:data` 可检查食品数据必填字段、重复 id、枚举值、来源 URL、来源检索日期、数据状态和 JECFA/GB 2760 状态边界，并输出 status 分布、缺来源字段、缺限量和来源版本分布质量报告；服务层可生成审核摘要、来源聚合、版本聚合和人工校验队列 | 导入脚本、审核流程、变更记录、GB 2760 条款级质量报告、完整审核后台 | 已有校验、质量报告、透明展示入口和只读待审核入口，但还没有完整审核后台 |

#### 食品添加剂专用字段（新增，部分完成）

| 字段 | 说明 | 来源 | 状态 |
|---|---|---|---|
| `eNumber` | EU E-number（如 E330） | EU 法规 | schema 已完成，食品添加剂 seed 已按“如有”口径草稿填充 |
| `gbCode` | GB/INS 编号（如 INS 330） | GB 2760 / Codex INS | schema 已完成，食品添加剂 seed 已草稿填充 |
| `gbStatus` | GB 2760 状态：`permitted` / `restricted` / `prohibited` | GB 2760 | schema 已完成，食品添加剂 seed 已草稿填充；未升级为 `verified_regulation` |
| `adi` | 每日允许摄入量（如 “0–40 mg/kg bw”） | JECFA / Codex | schema 已完成，32 条已按 JECFA 官方数据库精确或直接映射条目更新摘要，其中 5 条同时完成 GB 2760 法规核验 |
| `usageLimits` | 使用限量和适用食品类别（如”饮料：0.2g/kg”） | GB 2760 | schema 已完成，5 条已从 GB 2760-2024 官方 PDF 表 A.1 导入；其余食品添加剂 seed 暂不填占位限量，避免将未审核限量误展示为真实数据；官方 PDF 行级抽取数据先进入 `gb2760_official_records` staging 表 |
| `foodCategories` | 允许使用的食品类别列表 | GB 2760 | schema 已完成，食品添加剂 seed 已草稿填充 |
| `allergenTypes` | 过敏原类别标注 | EU 14 类标准 | schema 已完成，食品基础库已草稿标注部分相关项 |
| `cautionFor` / `cautionGroups` | 特殊人群（孕妇/婴幼儿/糖尿病）禁忌说明 | 多来源 | schema 已完成，食品添加剂 seed 已草稿填充 |
| `dataStatus` | verified_regulation / verified_jecfa / mapped_candidate / common_ingredient / unverified / unknown_from_ocr | 来源可信分层 | schema 已完成，当前为 5 / 27 / 0 / 12 / 68 / 0 |
| `sourceScope` | 来源用途范围 | GB 2760 / JECFA / common ingredient / OCR 等 | schema 已完成，用于避免把 JECFA 当成 GB 2760 使用范围 |

#### 食品数据规模目标

| 阶段 | 目标数量 | 说明 |
|---|---|---|
| 基础权威库 | 100+ 条 | 先覆盖高频食品添加剂和常见普通配料，所有数据必须有状态和来源 |
| 持续扩充库 | 按批次增长 | 通过 GB 2760 官方数据导入、JECFA 映射和人工校验队列逐步扩充 |
| 长期法规库 | 不承诺一次性补齐 | 以可追溯 GB 2760 条款、版本、适用类别和原文片段为准，宁缺毋滥 |

### 6.3 搜索和分析逻辑

| 功能项 | 状态 | 已实现 | 还需要实现 | 证据 |
|---|---|---|---|---|
| 精确搜索 | 基础实现 | 名称完全匹配得高分 | 大小写、符号、空格、语言归一增强 | `getSearchScore` |
| 模糊搜索 | 基础实现 | startsWith/includes 简单匹配 | 拼音、错别字、同义词、分词、权重调优 | `ingredientService.js` |
| 分类搜索 | 基础实现 | haystack 包含分类和描述，搜索页可按分类和风险等级组合筛选 | 拼音、错别字、分词、权重调优 | `ingredientService.js` |
| 文本拆分 | 基础完成 | `parseIngredientList` 输出结构化结果，支持 OCR 空格/换行修正、常见前缀、复配括号、百分比剥离、E-number 提取、顺序、重复和未知项保留；旧 `splitIngredientInput` 保持兼容 | 更多真实包装格式、嵌套复合原料、浏览器 E2E | `src/utils/text.js`、`scripts/test.mjs` |
| 本地/数据库匹配 | 基础完成 | 新增 `ingredientMatchService`，支持 E-number、精确、别名、模糊匹配和低置信提示；前端优先调用后端 `POST /api/ingredients/batch-search`，失败时本地 fallback，未匹配项不丢弃 | 大数据量召回、冲突消解、人工确认 UI、匹配质量评估 | `src/services/ingredientMatchService.js`、`src/services/ingredientApiService.js`、`backend/src/routes/ingredients.ts`、`backend/src/services/ingredientService.ts` |
| 分析总结 | 原型实现 | 根据匹配数和风险数生成一句总结 | 结构化报告、风险解释、来源引用、置信度 | `buildAnalysisSummary` |

### 6.4 个人档案与过敏原系统（新增主线功能）

| 功能项 | 状态 | 已实现 | 还需要实现 | 说明 |
|---|---|---|---|---|
| 用户过敏原录入页 | 基础完成 | 设置页 UI 支持选择、保存、清空标准 14 类过敏原，并在本机数据面板中展示过敏原数量；首次引导说明以后可在设置页修改并补充关注/忌口 | 更多地区标准映射、文案细化、浏览器视觉验收 | 新增 `src/pages/settingsPage.js` |
| 关注成分与忌口项 | 基础完成，登录态同步起步 | 新增 `compcheck:watch-ingredients` 和 `compcheck:avoid-ingredients`，设置页支持按当前类别搜索添加、chip 删除、本机快照导入/导出和清空；登录后通过 `/api/user/profile/watch`、`/api/user/profile/avoid` 自动同步 | 真实跨设备验收、离线队列、移动端视觉验收 | `src/services/personalProfileService.js`、`src/services/storageService.js`、`backend/src/routes/user.ts` |
| 过敏原 localStorage 持久化 | 基础完成，登录态同步起步 | `getUserAllergens()` / `setUserAllergens(ids)` 使用 `compcheck:allergens`，首次启动引导和设置页已接入，并可随本机数据快照导出或清空；底层 storageService 登录态可同步 `/api/user/allergens` | 隐私开关、离线同步队列、跨设备验收 | 已扩展 `userStore.js`、`src/services/storageService.js`、`backend/src/routes/user.ts` |
| 本机数据与隐私控制 | 基础完成 | 设置页展示收藏、历史、报告、扫描草稿、对比列表、过敏原、关注成分和忌口项数量；支持导出本机 JSON 快照、从 JSON 快照导入恢复和一键清空本机数据；首次启动偏好和对比列表会随本机数据快照导出/导入 | 账号删除、云端数据导出、正式隐私政策 | `src/pages/settingsPage.js`、`src/pages/onboardingPage.js`、`src/store/userStore.js`、`src/main.js`、`scripts/test.mjs` |
| 搜索结果个性化警告 | 基础完成 | 结果列表中按过敏原 > 忌口项 > 关注成分优先级显示 badge | 真实食品数据标注、视觉验收 | 已扩展 `searchPage.js` |
| 详情页个性化警告 | 基础完成 | 详情页顶部可显示过敏原、忌口或关注 banner | 真实食品数据标注、视觉验收 | 已扩展 `detailPage.js` |
| 报告页个人命中摘要 | 基础完成 | 报告详情在关注摘要后展示个人命中摘要，并在匹配成分条目中显示个人 badge | 视觉验收、跨设备同步 | 已扩展 `reportDetailPage.js` |
| 分析结果过敏原警告 | 基础完成 | 成分表分析结果中可单独列出含过敏原成分 | 真实食品数据标注、视觉验收 | 已扩展 `analyzePage.js` |
| 成分数据过敏原字段 | schema 已完成，真实数据未标注 | `FoodAdditive.allergenTypes` 已定义 | MVP 食品数据逐条标注 | 需更新所有食品数据 |
| 过敏原标准分类管理 | 已完成 | 统一过敏原分类枚举，供数据标注和用户选择使用 | 后续可补更多地区标准映射 | 已新增 `src/data/allergens.js` |

### 6.5 OCR、AI、后端

| 功能项 | 状态 | 已实现 | 还需要实现 | 真实评价 |
|---|---|---|---|---|
| 图片上传入口 | 基础完成 | 扫描页支持拍照、相册、Web 文件选择降级、常见图片类型和 8 MB 大小校验、图片预览、EXIF 修正、压缩、IndexedDB 存图和确认页跳转；localStorage 只存图片 id 和元数据 | 裁剪、权限失败恢复页、真机验收 | 入口可用，图片不会写入 localStorage，但仍不具备真实 OCR 识别 |
| OCR 识别 | manual/fallback 抽象完成，真实服务未接入 | 已定义 OCR 协议版本 2、`recognizeImage`、real/manual/fallback 模式、15s 超时、错误分类、响应校验、确认页强制校对；后端 `POST /api/ocr` 需要 JWT，未配置 Key 返回 503，已配置但供应商未实现返回 501，绝不返回伪造文本 | OCR API Key、供应商适配、识别质量评估、费用控制 | 没有真实 OCR 调用，但已有安全可接入服务端代理的结构化协议 |
| AI 分析入口 | 协议起步，真实服务未接入 | 已定义 AI 协议版本、endpoint 占位、请求 payload、输出 contract、响应校验和本地 fallback；分析页展示本地 fallback | API 代理、模型选择、prompt、缓存、成本控制 | 没有真实 AI 调用，但已有可接入服务端代理的结构化协议 |
| 后端 API | 成分只读 API、基础鉴权和用户同步完成 | 已有 Hono 应用、`GET /health`、CORS、请求日志、全局 JSON 错误处理、配置读取、`GET /api/ingredients`、`GET /api/ingredients/categories`、`GET /api/ingredients/:id`、分页和非法参数 400；已完成 `/api/auth/*` 注册/登录/退出/me/账号删除和 `/api/user/*` 收藏、历史、过敏原、profile、报告、产品同步接口 | analyze、ocr、entitlements、支付回调等接口 | 已能从 PostgreSQL 查询食品添加剂并保存登录用户基础数据，但 Pro 能力、OCR/AI 和生产治理 API 仍未开始 |
| 数据库 | 成分库、账号和用户同步表基础完成 | Drizzle `ingredients`、`ingredient_sources`、`users`、`sessions`、`user_favorites`、`user_history`、`user_allergens`、`user_profile_ingredients`、`user_reports`、`product_archives` 表、迁移、食品基础库幂等 upsert 和数据状态字段 | 订阅权益、支付事件、OCR/AI 任务、审计日志、更多 profile 字段 | 成分、账号和用户同步数据底座已起步，但权益和任务数据仍未开始 |
| 密钥管理 | 示例起步 | `backend/.env.example` 定义 `DATABASE_URL`、`JWT_SECRET`、OCR/AI Provider 和 API Key 占位；真实 `.env` 已忽略 | 服务端 env、密钥轮换、权限隔离 | 不能接第三方服务 |
| 支付校验 API | 未开始 | 无 | Apple 票据校验、Google Play 购买校验、订阅状态刷新、恢复购买、Webhook/通知处理 | 付费权益必须服务端可信 |
| 成本控制 | 未开始 | 无 | OCR/AI 调用配额、失败重试限制、用户级限流、套餐用量统计 | 没有成本控制不能开放 Pro 能力 |

### 6.6 工程、测试、发布

| 功能项 | 状态 | 已实现 | 还需要实现 | 证据 |
|---|---|---|---|---|
| lint | 基础实现 | JS 语法检查和部分敏感文案扫描 | ESLint、格式化、复杂规则、CI 集成 | `scripts/lint.mjs` |
| 单元测试 | 基础覆盖扩展中 | 函数断言覆盖搜索、搜索建议、分类摘要、排序/筛选、相关成分、结构化解析、OCR 确认页、图片处理/IndexedDB fallback、批量匹配、过敏原、报告、路由、本机数据、Capacitor 降级、AI/OCR 协议校验；后端 Vitest 覆盖 health、CORS、404、500 JSON、ingredients API、batch-search、OCR API 无 Key/供应商未实现降级、auth API、user sync API 和 JWT middleware | 更多边界、浏览器行为测试、移动端 E2E、支付沙盒测试 | `scripts/test.mjs`、`backend/tests/` |
| 构建 | 基础完成 | Vite 构建输出压缩 CSS/JS、hash 资源和 public 静态资源到 `dist/`，生产资源使用相对 base | 生产预览部署、环境矩阵、移动端构建联动 | `vite.config.js`、`package.json` |
| E2E 测试 | 未开始 | 无 | 搜索、详情、收藏、成分对比、分析完整流程 | 无 |
| 浏览器验收 | 未开始 | 无 | 桌面/移动截图、兼容性、无障碍检查 | 无 |
| CI | 基础完成 | GitHub Actions 已包含 CI、CodeQL 和 AI Review 工作流；CI 会执行 `npm ci` 后再 lint/test/build，并覆盖 `public/`、`vite.config.js` 和 lockfile 变更 | 覆盖率、E2E、移动端构建、支付沙盒检查 | `.github/workflows/` |
| 移动端测试 | 未开始 | 无 | iOS 真机、Android 真机、不同屏幕尺寸、相机权限、弱网、离线 | 无 |
| 支付沙盒测试 | 未开始 | 无 | Apple Sandbox、Google Play license tester、订阅续期/取消/退款/恢复 | 无 |
| 部署 | 未开始 | 无 | Web 预览和生产环境、API 环境、App 测试轨道、生产发布、回滚、监控 | 无 |

### 6.7 移动端技术与体验

| 功能项 | 状态 | 需要实现 | 验收标准 |
|---|---|---|---|
| 技术选型落地 | 未开始 | 在 Capacitor、React Native、Flutter 中做 ADR；默认建议先走 Capacitor + 标准 SPA | 有决策记录、迁移成本、插件能力和发布流程说明 |
| iOS 工程 | 未开始 | Bundle ID、签名、证书、TestFlight、相机/相册权限、启动屏、App Icon | TestFlight 可安装，真机能完成搜索和扫描入口 |
| Android 工程 | 未开始 | applicationId、签名、AAB、权限、启动屏、App Icon、Play 内测 | Google Play 内测可安装，真机能完成搜索和扫描入口 |
| 安全区和导航 | Web 基础开始 | 已有 Web 小屏底部导航和底部安全区预留；仍需顶部返回、手势返回、键盘遮挡处理、动态字体 | iPhone SE、常见 Android 小屏和大屏无遮挡 |
| PWA 辅助入口 | 基础增强 | 已有 manifest、theme color、iOS Web App meta、72-512 多尺寸 PNG 图标、扫描/搜索快捷方式、Android `beforeinstallprompt` 安装入口、iOS 添加到主屏幕提示、service worker 注册和 v24 离线 app shell | iOS/Android 添加到主屏幕后完成启动、图标、显示模式、快捷方式和离线启动验收 |
| 离线与弱网 | 基础增强 | 已缓存核心静态资源、本地数据模块、manifest 和图标；导航和静态资源使用 stale-while-revalidate，成分 API 使用 network-first 缓存兜底，登录态 auth/user API 和 OCR API 保持 network-only；全局离线横幅和设置页说明离线边界 | 离线可查基础数据的浏览器验收、请求重试、同步队列、弱网实测、离线能力提示 |
| 推送和深链 | 未开始 | 报告完成通知、订阅状态提醒、从分享链接打开详情 | 后续增长和留存能力，不阻塞首发 |

### 6.8 账号、付费和权益

| 功能项 | 状态 | 需要实现 | 验收标准 |
|---|---|---|---|
| 账号体系 | 前后端基础完成，跨设备验收未完成 | 后端已完成邮箱注册、登录、JWT Bearer 鉴权、退出、`me`、账号删除和登录态用户数据同步 API；前端已完成登录/注册页、设置页登录/退出、JWT 过期清理、访客模式和登录后本机快照同步触发；仍需刷新 token、匿名用户升级和隐私导出 | 用户可在前端登录；仍需跨设备恢复收藏、过敏原、报告和订阅的真实验收 |
| 免费额度 | 未开始 | OCR 次数、AI 报告次数、历史报告数量等可配置限制 | 未付费用户能体验一次核心价值，超额后进入付费墙 |
| Apple IAP | 未开始 | 自动续订订阅、恢复购买、沙盒测试、审核说明 | iOS 可购买、恢复、取消后状态正确 |
| Google Play Billing | 未开始 | 订阅商品、购买流程、license tester、实时订阅通知 | Android 可购买、恢复、取消后状态正确 |
| 服务端权益 | 未开始 | 统一 entitlement 表、票据校验、过期刷新、退款/撤销处理 | 客户端重装或换设备后权益准确 |
| 会员中心 | 前端基础版完成，真实权益未接入 | 已可进入支持中心；仍需补真实续费状态、账号恢复购买、商店订阅管理、正式客服渠道和服务端 entitlement | 用户能理解自己买了什么、如何管理订阅，且状态来自可信服务端 |
| 支持中心 | 本机基础版完成，正式客服未接入 | `/support` 可记录订阅、数据纠错、扫描分析、隐私数据和功能问题，支持从详情页/数据页带入纠错反馈草稿，并支持复制、删除、清空和随本机数据导出导入 | 上线前仍需接正式客服邮箱、工单后台、账号关联和 SLA |

### 6.9 关键交互原则

| 场景 | 原则 | 细节要求 |
|---|---|---|
| 首次使用 | 先给价值，再要求设置或付费 | 可以跳过引导；过敏原设置建议但不强制；首次扫描或查询要快速完成 |
| 扫描识别 | 用户必须能校对 OCR 结果 | 识别后先展示可编辑文本，再分析；失败时保留图片和手动输入入口 |
| 风险提示 | 分层表达，不制造恐慌 | 区分“含过敏原”“需关注”“未收录”“来源未审核”；避免绝对化结论 |
| 付费转化 | 付费墙出现在价值点之后 | 免费额度用完、高级报告、导出、同步等场景触发；必须提供恢复购买 |
| 隐私控制 | 过敏原和报告属于敏感信息 | 默认本地优先；同步前明确告知；设置页提供清空和账号删除入口 |
| 空态/错误态 | 每个主流程都有下一步 | 无结果推荐换关键词或按类别浏览；OCR 失败可重试或手输；支付失败可重试和联系客服 |

## 7. 已知代码缺陷（需修复）

| 位置 | 问题描述 | 风险等级 | 复现方式 |
|---|---|---|---|
| 暂无 | 当前未记录未修复代码缺陷 | - | - |

## 7.1 本轮已修复缺陷

| 位置 | 修复内容 | 验证方式 |
|---|---|---|
| `src/services/storageService.js` `writeJson` | 增加 `localStorage.setItem` 异常兜底，配额满或不可用时回退到内存存储 | `npm run test` 覆盖异常 fallback |
| `src/utils/text.js` `splitIngredientInput` | 增加括号注释剥离，`"苯氧乙醇(防腐剂)"` 可拆为 `苯氧乙醇` | `npm run test` 覆盖括号输入 |
| `src/pages/favoritesPage.js` | 收藏页卡片增加内联“取消收藏”按钮 | `npm run lint`、`npm run build` |
| `src/types/ingredient.js` / `scripts/validate-data.mjs` | 将 `FoodAdditive.sourceNote` 明确为必填，并由数据校验脚本检查 | `npm run test` 覆盖缺失 `sourceNote` |
| `src/router/router.js` / `src/pages/notFoundPage.js` / `src/main.js` | 未知 hash 路由改为渲染 404 页面，并补充路由标题和主内容焦点管理 | `npm run test` 覆盖路由解析、404 渲染和标题 |
| `readme.md` 环境变量章节 | 移除旧 `VITE_` 环境变量示例，统一为 `.env.example` 和 `COMMANDS.md` 的非 Vite 口径 | `npm run lint` 扫描文案 |

## 8. 当前最关键缺口

| 优先级 | 缺口 | 为什么关键 | 不补的结果 | 下一步 |
|---|---|---|---|---|
| P0 | **食品添加剂数据源准确性** | 数据可信度决定产品是否可用 | 做完 OCR 也没有可信数据展示 | 人工确认官方来源（GB 2760 等），逐条补来源、ADI 和审核状态 |
| P0 | **真实 OCR 服务接入** | OCR 是本产品的核心功能和主路径 | 当前只能 manual/fallback，不能自动从图片识别文字 | 用户提供 OCR API Key 后接入供应商并做真机识别验收 |
| P0 | **食品配料分析报告** | 解析和匹配结果需要结构化呈现 | 用户拍完照片得不到完整产品级报告 | 完成 R-A 批次 |
| P1 | **跨设备同步验收** | 前端登录 UI 和后端账号 API 已完成基础接入 | 云同步和个性化设置尚未做真实多设备验收 | 验证登录后收藏、历史、过敏原、关注/忌口、报告和产品档案元数据可跨设备恢复 |
| P1 | **历史收藏和跨设备档案管理** | 用户需要能持续管理分析过的产品 | 已有基础产品档案，但收藏/历史管理和跨设备验收不足 | 完成 F-B 批次，并补生产图片/CDN策略 |
| P1 | **移动端/PWA 体验优化** | 产品核心场景在移动端（拍照） | 移动端体验差会直接影响核心功能可用性 | 完成 M-A/M-B 批次 |
| P2 | **生产数据库和部署** | 用户使用的是生产环境 | 当前只有本地数据库，不能向用户提供服务 | 完成 D-A/D-B 人工+Codex 任务 |
| P2 | **AI 解释层** | AI 可以让分析报告更易读 | 报告只有原始数据，缺少可读解释 | 配置 AI API Key 后完成 A-A 批次 |
| P3 | **订阅、支付、上架** | 付费是商业化目标 | 不影响核心产品功能，等主路径稳定后推进 | 阶段 10 批次，等核心闭环稳定后执行 |
| P3 | **合规材料和商店资料** | 上架必须通过审核 | 不影响开发进度，等产品功能稳定后准备 | 阶段 10 批次 |

## 9. 推荐里程碑

### M0：产品口径与开发规则校准

状态：已完成。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| 改正虚高进度 | 已完成 | 项目总进度按 iOS/Android 上线 + 可付费产品口径校准，当前记录为 8% |
| 细化已做/未做清单 | 已完成 | 本文档包含模块级和功能级进度表 |
| 明确禁止自动 push main | 已完成 | README 已加入必须走 PR/MR 的规则 |
| 明确商业化目标 | 已完成 | 计划中明确免费 + Pro 订阅、App Store / Google Play 上架和支付合规要求 |

### M1：Web/PWA 可用 MVP 与食品数据基础

状态：进行中。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| 定义 `FoodAdditive` 数据 schema | 已完成 | 包含 E-number、GB编号、ADI、gbStatus、usageLimits、allergenTypes、cautionFor 字段 |
| 重构路由，加类别层 | 基础完成 | 路由支持 `/food/search`、`/food/ingredient/:id`、`/cosmetics/search` 等，首页有类别切换入口，并已补基础 404、页面标题、主内容焦点管理和类别感知顶部导航 |
| 建立基础权威数据底座 | 进行中 | 已有 100 条食品添加剂 seed、GB 2760-2024 官方标准文本来源、官方 PDF 全 264 页逐页全文入库数据、5 条 GB 2760 官方 PDF 条款级数据、2404 行官方 PDF staging 入库数据、100 条 seed 中有 A.1 证据的 91 条已全部覆盖、27 条 JECFA-only 安全评价匹配、12 条普通配料词库、分层状态字段和只读人工校验队列；仍需完成 GB 2760 staging 人工审核、正式库升级和完整审核后台 |
| 增加数据校验脚本 | 已完成 | 缺字段、重复 id、无来源 URL、无来源检索日期、无 gbStatus 能被检查出来 |
| 食品详情页展示食品专用字段 | 基础完成 | 详情页展示 E-number、INS、ADI、适用食品类别、GB 2760 状态、草稿状态和数据来源；无精确限量时显示空态，并基于分类、功能、食品类别、过敏原和人群提醒展示相关成分；功能分类芯片可跳转到搜索筛选或关键词搜索 |
| 成分对比基础版 | 基础完成 | 可从搜索、详情、收藏把同类别成分加入本机对比列表，`/compare` 可查看横向对比、移出、清空和空状态，并纳入本机数据导出/导入/清空 |
| 增强食品成分表文本解析 | 进行中 | 已修复括号注释剥离；仍需能处理真实食品包装成分表格式 |
| 增强搜索测试（食品方向） | 基础完成 | 已覆盖 E-number、INS 编码、新增食品数据编码入口、食品成分表匹配、首页分类筛选入口、搜索排序、风险分布筛选、分类分布筛选、详情页相关成分、成分对比、过敏原标注、路由解析、404、搜索筛选和筛选控件渲染；仍需补更多边界输入 |
| 移动端 Web 适配 | 基础开始 | 已新增小屏底部主导航、隐藏桌面顶部导航、为主内容预留底部安全区，补充独立扫描页、PWA 扫描快捷方式和 service worker 离线 app shell；仍需真实视口截图验收 |
| 数据来源与审核状态页 | 已完成基础版 | `/food/data` 可查看食品数据来源、版本、审核状态、分类覆盖和上线前缺口，并从首页数据状态进入 | 补逐条来源条款、审核状态变更记录和后台发布流程 |
| 首次启动引导 | 已完成基础版 | `/food/onboarding` 可选择默认类别、过敏原、搜索历史记录偏好并确认使用边界；可跳过，状态写入本机偏好并随本机数据导出/导入 | 补相机权限、订阅权益说明和真机视觉验收 |
| 支持中心基础版 | 基础完成 | `/support` 可从设置页、会员中心、详情页和数据页进入，保存本机反馈记录，支持预填数据纠错草稿、复制、删除、清空，并随本机数据导出/导入/清空 | 补正式客服渠道、工单后台、账号关联和移动端真机验收 |

### M2：移动端 App 基座

状态：进行中，Vite 前端工程化基座、Capacitor 项目脚手架和基础原生适配层已完成，人工签名配置与真机验收未开始。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| 技术选型 ADR | 未开始 | 明确 Capacitor / React Native / Flutter 取舍，给出首版选择和退出条件 |
| 标准前端工程迁移 | 基础完成 | Vite dev/build/preview、public 静态资源、压缩 hash 产物、CI 依赖安装已完成；TypeScript 和 API client 后续按需要评估 |
| Capacitor 项目脚手架 | 基础完成 | `capacitor.config.json`、Capacitor 依赖、`cap:sync` / `cap:open:*` 脚本可用，`ios/` 和 `android/` 作为本机生成目录忽略 |
| iOS 工程 | 未开始 | TestFlight 可安装，能打开首页、搜索、详情、分析入口 |
| Android 工程 | 未开始 | Google Play 内测可安装，能打开首页、搜索、详情、分析入口 |
| 原生权限 | 基础适配完成，真机权限恢复未验收 | 相机、相册、网络、通知权限文案清楚，拒绝权限后有可恢复路径 |
| 真机验收清单 | 未开始 | 覆盖 iPhone 小屏/大屏、Android 小屏/大屏、深色模式、动态字体和弱网 |

### M3：后端、账号和同步

状态：后端项目初始化、成分数据库 schema、seed、只读成分 API、基础账号鉴权、前端登录入口和登录态用户数据同步触发已完成，订阅权益、生产安全和 OCR/AI 代理未开始。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| 后端项目初始化 | 已完成 | API 服务可本地启动，有健康检查、CORS、配置管理、请求日志、全局 JSON 错误处理、Docker/Compose 和 Vitest 测试 |
| 数据库 schema | 部分完成 | `ingredients`、`ingredient_sources`、`users`、`sessions`、`user_favorites`、`user_history`、`user_allergens`、`user_reports` 表已完成迁移，食品基础库已支持分层数据状态；entitlements、payment events、OCR/AI task 表仍待后续批次 |
| 鉴权 | 基础完成 | 支持邮箱注册、登录、JWT Bearer 鉴权、退出、账号删除；刷新 token 和匿名升级待后续批次 |
| 云同步 | 基础完成 | 收藏、历史、过敏原档案、关注成分、忌口项、报告和产品档案已有 JWT 鉴权 API 或同步接口，前端登录后会把本机快照写入登录态存储并触发 storageService 后台同步；仍需离线队列和真实跨设备验收 |
| API 安全 | 基础开始 | 已有 JWT Bearer middleware、无效/过期 token 401 JSON 和基础输入校验；限流、错误码规范、审计日志、密钥只在服务端仍待完善 |

### M4：订阅支付和会员权益

状态：会员中心前端基础版完成，真实订阅支付未开始。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| 套餐设计 | 前端草案 | 明确免费版、Pro 月付/年付权益、免费额度、退款和恢复购买逻辑 |
| Apple IAP 接入 | 未开始 | 沙盒购买、恢复、取消、过期状态都能同步到服务端 |
| Google Play Billing 接入 | 未开始 | license tester 购买、恢复、取消、过期状态都能同步到服务端 |
| 服务端 entitlement | 未开始 | 同一账号在 iOS/Android/Web 能拿到一致权益 |
| 会员中心和付费墙 | 会员中心基础版完成，付费墙未开始 | 用户能查看套餐、权益用量、恢复购买、管理订阅和联系客服；真实购买和恢复必须通过商店与服务端校验 |
| 支付验收 | 未开始 | 覆盖购买成功、失败、取消、退款、过期、换设备、重装 |

### M5：OCR、AI 和 Pro 报告

状态：未开始。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| OCR 小样验证 | 未开始 | 用真实食品包装样本记录准确率、成本、失败类型和人工校对成本 |
| OCR 服务端代理 | 协议起步 | 已固定本地请求 payload、输出 contract、响应校验和本地 fallback；真实图片上传、压缩、识别、失败重试和限流仍需在服务端控制 |
| AI 分析协议 | 基础完成 | 已固定本地请求 payload、输出 contract、响应校验和本地 fallback；后续接服务端代理时不得让模型输出直接覆盖本地报告结构 |
| 报告保存和导出 | 前端基础实现 | 已有本地报告保存、Markdown/JSON 导出和原生分享 / Web Share / 复制 fallback；仍需 Pro 权益限制、云同步、PDF/图片导出和服务端报告能力 |
| 成本监控 | 未开始 | 每个用户、每个套餐、每次 OCR/AI 调用有成本和用量记录 |

### M6：上架前质量、合规和内测

状态：未开始。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| E2E 测试 | 未开始 | 食品搜索、过敏原警告、扫描、报告、收藏、成分对比、会员中心完整流程自动跑通 |
| 移动端真机测试 | 未开始 | iOS/Android 主流设备完成截图验收和崩溃检查 |
| 隐私和条款 | 应用内草案入口完成，正式政策未完成 | 隐私政策、服务条款、订阅条款、数据来源说明、客服入口完成，并与平台表单和真实服务保持一致 |
| App Store Connect | 未开始 | 元数据、截图、隐私信息、IAP、审核说明和 demo 账号准备完成 |
| Google Play Console | 未开始 | 商店资料、数据安全、内容分级、内测轨道、测试用户准备完成 |
| Google Play 闭测窗口 | 未开始 | 如适用，至少 12 名测试者连续 14 天参与闭测后再申请生产访问 |

### M7：正式上线和运营

状态：未开始。

| 任务 | 状态 | 验收标准 |
|---|---|---|
| 生产发布 | 未开始 | iOS、Android、Web 生产环境均可访问，核心 API 稳定 |
| 灰度和回滚 | 未开始 | 支持分阶段发布、快速下架/回滚、版本兼容说明 |
| 监控和客服 | 未开始 | 崩溃、接口错误、支付失败、OCR/AI 成本和用户反馈可追踪 |
| 订阅指标 | 未开始 | 试用转化、订阅转化、续费、取消、退款、ARPU 可统计 |
| 内容运营 | 未开始 | 食品添加剂数据更新、审核、版本说明和用户反馈闭环可执行 |

## 10. 最近一次修改记录

| 日期 | 修改内容 | 修改人/Agent | 验证结果 |
|---|---|---|---|
| 2026-06-13 | 继续 GB 2760-2024 官方 PDF reference rows：扩展 `scripts/generate-gb2760-reference-tables.mjs`、`src/data/gb2760OfficialReferenceTables.js`、`scripts/validate-data.mjs` 和 `scripts/test.mjs`，将 PDF 第 149-264 页参考表区域全部转换为 2800 行 reference rows：表 A.2=68、表 B.1=29、表 B.2=388、表 B.3=1504、表 C.1=37、表 C.2=80、表 C.3=66、附录 D=23、表 E.1=318、附录 F=287；所有新增行保持 `needs_review` 并保留页码、官方来源字段、PDF SHA-256 和原始行证据 | Codex | `node scripts/generate-gb2760-reference-tables.mjs`、`npm run validate:data`、`npm run test`、`cd backend && npm run db:seed`、本地 PostgreSQL 分表计数查询、`git diff --check` 通过；seed 写入 112 条 ingredient、2404 行 A.1 staging、264 页全文、2800 行 reference rows |
| 2026-06-13 | 继续 GB 2760-2024 官方 PDF reference rows：扩展 `scripts/generate-gb2760-reference-tables.mjs` 和 `src/data/gb2760OfficialReferenceTables.js`，将表 B.1 PDF 第 152 页（标准页 149）转换为 29 行“不得添加食品用香料、香精的食品名单”reference rows，并保留脚注 a 的香料例外和剂量条件；当前 reference rows 合计 97 行，表 A.2=68、表 B.1=29 | Codex | `npm run validate:data` 输出 `GB 2760 reference table report: rows=97, a2ExceptionFoodCategories=68, b1NoFlavorFoodCategories=29, pdfPages=3, tables=表 A.2=68; 表 B.1=29`；`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run db:seed -- --version gb2760-reference-b1-20260613 --reviewed-by codex --change-note "GB 2760 official Table B.1 reference rows"`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`git diff --check` 通过；本地数据库计数为 112 条 ingredient、2404 行 A.1 staging、264 页全文、表 A.2 reference rows 68 行、表 B.1 reference rows 29 行 |
| 2026-06-13 | 继续 GB 2760-2024 官方 PDF 结构化：新增 `scripts/generate-gb2760-reference-tables.mjs`、`src/data/gb2760OfficialReferenceTables.js`、后端 `gb2760_official_reference_rows` 表和 seed 同步通路，将表 A.2 PDF 第 149-150 页（标准页 146-147）转换为 68 行例外食品类别 reference rows，保存例外食品类别编号、食品分类号、食品名称、页码、官方来源字段和 PDF SHA-256；同时修复官方 PDF 派生表 seed 只 upsert 不清理旧行的问题，确保本地数据库精确匹配当前源文件 | Codex | `npm run validate:data` 输出 `GB 2760 reference table report: rows=68, a2ExceptionFoodCategories=68, pdfPages=2, tables=表 A.2=68`；`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run db:migrate`、`cd backend && npm run db:seed -- --version gb2760-reference-a2-20260613 --reviewed-by codex --change-note "GB 2760 official Table A.2 reference rows"`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`git diff --check` 通过；本地数据库计数为 112 条 ingredient、2404 行 A.1 staging、264 页全文、68 行 A.2 reference rows |
| 2026-06-13 | GB 2760-2024 官方 PDF 全文转换入库层已完成，表 A.1 PDF 第 8-148 页已转换为 staging：`src/data/gb2760OfficialFullText.js` 保存官方 PDF 全 264 页逐页文本、页 SHA-256、PDF SHA-256 和官方平台来源字段，后端新增 `gb2760_official_pages` seed upsert 通路；新增 `scripts/generate-gb2760-a1-staging.mjs` 和 `src/data/gb2760OfficialGeneratedA1Staging.js`，与人工校对行合并后 `src/data/gb2760OfficialStaging.js` 当前为 2404 行表 A.1 staging 记录，其中 13 行与首批 5 条 `verified_regulation` 对齐，2391 行为 `needs_review`，957 行按唯一名称/别名或单一 INS 码精确匹配关联本地 ingredient，1447 行尚未匹配本地 ingredient；抽取脚本已加入标题续行、脚注过滤、INS 子码精确匹配和已定位跨行食品分类校正；100 条 seed 中有 A.1 证据的 91 条已全部覆盖，9 条无可结构化 A.1 证据；不自动升级正式成分详情 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run db:seed -- --version gb2760-staging-coverage-20260613 --reviewed-by codex --change-note "GB 2760 official Table A.1 staging INS subcode exact auto-link"`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`git diff --check` 通过；seed 写入 112 条 ingredient、2404 行 GB 2760 staging、264 页全文 |
| 2026-06-12 | 基于食品安全国家标准数据检索平台官方 PDF 首批导入 GB 2760-2024 表 A.1 条款级数据：`citric-acid`、`sodium-citrate`、`xanthan-gum`、`calcium-carbonate`、`sodium-bicarbonate` 升级为 `verified_regulation` / `isVerified: true`，写入使用范围、最大使用量、PDF 页码/标准页码、官方来源引用和文件 SHA-256；食品基础库当前为 5 条 GB 2760 法规验证、27 条 JECFA-only、12 条普通配料、68 条未验证，首页限量覆盖为 5% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-12 | 确认 GB 2760-2024 官方来源：以国家卫健委公告（2024年第1号）和食品安全国家标准数据检索平台为准，记录标准文本 ID、附件 ID、发布日期、实施日期和下载接口；官方 PDF 已保存到 `/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf`（`2600140` bytes，SHA-256 `2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de`）；该步骤先将未验证 seed 的主来源更新为官方平台记录，并将平台检索结果写入 `rawSourceText`，不使用第三方网站作为 `official_standard`；条款级结构化导入见上一条记录 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-12 | 新增数据治理页人工校验队列：从本机 OCR 来源报告聚合 `unknown_from_ocr` / `ocr_unmatched` 未收录项，从报告聚合低置信候选，并从静态数据聚合 `unverified` / `mapped_candidate` / `seed_reference` 记录；队列提供数据纠错预填入口，但不自动升级任何法规验证状态 | Codex | `npm run test`、`npm run validate:data`、`npm run lint`、`npm run build`、`git diff --check` 通过 |
| 2026-06-12 | 建立基础权威数据底座口径：新增 `verified_regulation`、`verified_jecfa`、`mapped_candidate`、`common_ingredient`、`unverified`、`unknown_from_ocr` 分层；食品基础库为 112 条，其中 32 条 JECFA 安全评价、12 条普通配料词库、68 条未验证，GB 2760 法规核验仍为 0；分析报告展示已匹配、待确认、暂未收录、数据状态、来源和低置信提示；明确后续是持续扩充与人工校验队列，不一次性补齐所有食品配料 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck && npm test && npm run build && npm run db:generate && npm run db:migrate && npm run db:seed -- --version food-authority-foundation-v1 --reviewed-by codex --change-note "foundation data status layer"` 通过 |
| 2026-06-12 | 继续 `CODEX_TASKS.md` Data Batch 1-B 第二批官方来源导入：在首批 10 条基础上新增 22 条 WHO JECFA Food Additives and Contaminants Database 可直接映射条目，累计 32 条升级为 `reviewStatus: reviewed` / `confidenceLevel: medium`；其余 68 条保持未验证，全部记录仍 `isVerified: false` 且 `usageLimits` 为空；同步 `DATA_SOURCES.md`、`CODEX_TASKS.md`、`AI_REVIEW.md` 和测试断言，整体产品进度更新为 50% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck && npm test && npm run build && npm run db:migrate && npm run db:seed -- --version food-additives-official-review-v2 --reviewed-by codex --change-note "JECFA official review batch 2"`、本地 PostgreSQL 汇总查询、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Data Batch 1-B 首批官方来源导入：从 WHO JECFA Food Additives and Contaminants Database 导入 10 条高频食品添加剂精确名称条目和 ADI 摘要，升级为 `reviewStatus: reviewed` / `confidenceLevel: medium`；其余 90 条保持未验证，所有记录仍 `isVerified: false`，`usageLimits` 继续为空以避免伪造 GB 2760 逐食品类别限量；`npm run validate:data` 新增质量报告输出；同步 `DATA_SOURCES.md`、`CODEX_TASKS.md`、`AI_REVIEW.md` 和测试断言，整体产品进度更新为 49% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck && npm test && npm run build && npm run db:migrate && npm run db:seed -- --version food-additives-official-review-v1 --reviewed-by codex --change-note "JECFA official review batch 1"`、本地 PostgreSQL 汇总查询、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch U-B 关注成分与忌口项跨设备同步：新增 `user_profile_ingredients` Drizzle schema 和迁移，提供 `GET/PUT /api/user/profile/:kind` 支持 `watch` / `avoid` whole-set replace；前端 `storageService` 将 `compcheck:watch-ingredients`、`compcheck:avoid-ingredients` 接入现有 hydrate-before-write 登录态云同步；补充后端 profile route 测试和前端同步结构测试；整体产品进度更新为 48% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck && npm test && npm run build && npm run db:migrate`、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch M-B PWA 体验优化与离线能力：manifest 更新为成分镜安装信息、扫描/搜索快捷方式和多尺寸 PNG 图标；service worker 更新到 `compcheck-shell-v24`，区分 app shell、成分 API、登录态 API、OCR API、图片/图标缓存策略，install 阶段预热 Vite JS/CSS bundles，运行时刷新 HTML 前先缓存新 HTML 引用的 bundles，图片/图标可回退读取 shell 预缓存，并避免缓存 auth/user 账号数据；新增全局离线横幅、Android/iOS 安装提示、iOS `100dvh`、顶部 safe-area、离线横幅/header 遮挡和输入框 zoom 修复、设置页离线能力说明以及 `docs/pwa-offline-capability.md`；整体产品进度更新为 46% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check`、`codex review --uncommitted` 通过；仍需 iPhone/Android 真机安装验收 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Data Batch 1-C 数据版本管理与审核状态后台化：后端新增 `reviewed_by`、`reviewed_at`、`change_note` 字段和 `confidence_level` / `data_version` 索引，列表/search API 支持 `confidenceLevel=high|medium|low|unverified`；seed 脚本支持 `--version`、`--reviewed-by`、`--change-note` 并仅在版本变化时更新变更说明；前端 `/data` 页支持来源和可信等级筛选，展示可信等级统计和待审核比例；同步 `COMMANDS.md`、`DATA_SOURCES.md`、`CODEX_TASKS.md` 和 `AI_REVIEW.md`，整体产品进度更新为 47% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck && npm test && npm run build && npm run db:migrate && npm run db:seed -- --version 2026-06-v1 --reviewed-by system --change-note "Data 1-C verification"`、`curl /health`、`curl "/api/ingredients?confidenceLevel=unverified&limit=5"`、`curl -i "/api/ingredients?confidenceLevel=trusted&limit=5"`、`git diff --check` 通过；本批次未升级任何 seed 的审核状态 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch M-A 首页与导航重构：新增成分镜 appbar、全宽拍照识别 CTA、本机状态摘要、独立成分搜索和热门类别分区；底部导航改为首页/识别/搜索/历史/我的，保留 link 导航语义并补跨子路由 active 映射；新增设计系统变量、skeleton、统一页面级 empty/error 状态、错误重试按钮和页面进入动画；PWA cache 更新到 `compcheck-shell-v22`；并在 `CODEX_TASKS.md` 新增部署资源、成本控制与人工部署原则；整体产品进度更新为 45% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check`、`codex review --uncommitted` 通过；仍需 iPhone Safari 和基础 axe/视觉人工验收 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch F-B 历史列表与产品收藏管理：新增 `/history` 分析历史页，支持搜索、全部/收藏/高关注筛选、清空、移动端左滑删除和 50 条 UI 展示上限；收藏页新增“收藏产品”Tab；首页展示最近分析产品缩略图和“查看全部历史”入口；移动底部导航改为首页/扫描/搜索/历史/我的；整体产品进度更新为 41% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch R-A 食品配料分析报告页：新增报告数据模型和详情页，报告支持整体评级、关注摘要、配料顺序说明、食品添加剂分类统计、未收录项、特殊人群提示、数据来源说明、分享摘要和 Markdown/JSON 导出；保存报告上限提升到 50 条，新增 `/report/:id` 路由别名。整体产品进度更新为 38% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch O-A/O-D/O-B/O-C/P-A/P-B：首页突出拍照识别主入口；扫描页支持拍照/相册、图片预处理、EXIF 修正、压缩和 IndexedDB 存图；新增 OCR real/manual/fallback 抽象和后端 `/api/ocr` 安全占位；新增识别文本确认页；增强配料解析并接入数据库批量匹配，未匹配和低置信项保留提示。真实 OCR 供应商调用仍等待 OCR API Key，整体产品进度更新为 36% | Codex | `npm install`、`npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm install`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run db:migrate`、`cd backend && npm run db:seed` 通过 |
| 2026-06-12 | 完成数据优先重排和可信成分数据底座闭环：暂停订阅、支付、OCR、AI、上架、iOS/Android 签名相关开发，补齐食品添加剂来源可信字段，新增数据库迁移和 seed 对接，补 `GET /api/ingredients/search?q=`，前端食品搜索/详情优先读取后端 API 并失败降级本地数据，详情展示来源与可信等级，搜索结果标识未验证数据；新增数据来源文档和更严格数据校验。整体产品进度按数据优先口径校准为 28% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`cd backend && npm run db:migrate`、`cd backend && npm run db:seed`、API curl 验收、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch 3-D 收藏与历史云同步：新增 `user_favorites` / `user_history` / `user_allergens` / `user_reports` Drizzle schema 和迁移，实现 JWT 鉴权下的 `/api/user/favorites`、`/api/user/history`、`/api/user/allergens`、`/api/user/reports` 同步 API；前端 `storageService` 新增 JWT 登录态检测，登录时后台同步收藏、历史、过敏原和报告，未登录或 API 失败时保持本地存储行为；批量无效项返回 400，避免静默丢弃或污染同步数据；整体产品进度更新为 32% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`cd backend && npm run db:migrate`、`cd backend && npm run db:seed`、Docker API 注册/鉴权/收藏/历史/过敏原/报告同步 curl 验收、`git diff --check` 通过 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 3-C 账号与鉴权：新增 `users` / `sessions` Drizzle schema 和迁移，后端安装 `bcrypt` / `jsonwebtoken`，实现邮箱注册、登录、JWT 7 天会话、退出失效、`GET /api/auth/me`、`DELETE /api/auth/account` 和 Bearer middleware；邮箱重复返回 409、非法邮箱/短密码返回 400、无效 token 返回 401；整体产品进度更新为 30% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`cd backend && npm run db:migrate`、`cd backend && npm run db:seed`、Docker API 注册/登录/me/logout/删除账号 curl-equivalent 验收、`git diff --check` 通过 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 3-B 数据库 Schema 与成分 API：新增 Drizzle `ingredients` / `ingredient_sources` schema、迁移、100 条食品添加剂幂等 seed、`GET /api/ingredients` 列表筛选分页、`GET /api/ingredients/categories` 分类统计、`GET /api/ingredients/:id` 详情和 404/400 JSON；关键词搜索转义 LIKE 通配符，aliases 使用 JSONB 数组元素级匹配，并新增 `pg_trgm`/GIN 搜索索引；CI 增加后端 typecheck/test/build，整体产品进度更新为 28% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`cd backend && npm run db:migrate`、`cd backend && npm run db:seed`、API curl 验收、`git diff --check` 通过 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 3-A 后端项目初始化：新增 `backend/` Node.js 20 + TypeScript + Hono 工程、`GET /health`、CORS、请求日志、全局 JSON 错误处理、`.env.example`、Dockerfile、PostgreSQL 15 Compose、README、Vitest 后端测试和根项目静态断言；本地默认绑定 `127.0.0.1`，Compose 覆盖为 `0.0.0.0`；整体产品进度更新为 27% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`cd backend && npm run dev` + `curl http://127.0.0.1:3000/health`、`git diff --check` 通过 |
| 2026-06-12 | 完成 `CODEX_TASKS.md` Batch F-A 产品档案与 IndexedDB 图片存储：新增产品档案 service、`/products` 列表、`/product/:id` 详情、报告详情建档入口、本地数据导入/导出/清空联动、登录态产品档案同步 key、后端 `product_archives` 表和 `/api/user/products` CRUD/搜索/过滤 API；OCR 确认后的图片不再提前删除，保存报告会保留 `imageId`，建档时生成小缩略图，localStorage 不保存完整图片；整体产品进度更新为 40% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`cd backend && npm run typecheck`、`cd backend && npm test`、`cd backend && npm run build`、`git diff --check` 通过；`cd backend && npm run db:migrate` 因当前 Docker volume 的 `postgres` 密码与 `.env` 不一致失败，需人工决定是否重建本地数据库卷或提供正确连接串 |
| 2026-06-11 | 修复 PR #47 合并后 Codex Review 反馈：native Capacitor 分享路径会清理 `capacitor://localhost`、`https://localhost`、hash-only 和相对路径等内部 URL，避免系统分享或 fallback 复制不可打开的本机链接；公共 URL 保留，整体产品进度维持 26% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`npx cap sync`、`git diff --check` 通过 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 2-C 原生权限与移动端适配：安装 Capacitor Camera/Filesystem/Share 7.x 插件，新增原生平台适配服务，扫描页支持系统相机/相册入口并在 Web 或失败时降级到文件选择，分享链路升级为原生分享 / Web Share / 复制 fallback，补 `viewport-fit=cover`、safe-area bottom、iOS Info.plist 权限文档、PWA cache v17 和非 native fallback 测试；整体产品进度更新为 26% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`npx cap sync`、`git diff --check` 通过 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 2-B Capacitor 项目脚手架：安装 Node 20.19 兼容的 Capacitor 7.x 依赖，新增 `capacitor.config.json`，补充 `cap:sync` / `cap:open:*` 脚本，忽略本机 `ios/` 和 `android/` 平台目录，并在测试和命令文档中固定配置；整体产品进度更新为 25% | Codex | `npm run cap:sync`、`npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`npx cap doctor` 显示依赖已安装且 Android 正常，但因本机未安装 Xcode 返回非零状态 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 2-A 前端工程化迁移：引入 Vite、更新 `npm run dev/build/preview`、新增 `vite.config.js`、将 manifest/icon/service worker 迁移到 `public/`，service worker 改为适配 Vite hash 产物的静态入口和运行时缓存，CI 使用 Node 20.19、增加 `npm ci` 并覆盖 Vite/public/lockfile 触发路径；同时调整 AI Review 并发分组，避免 `@codex review` 评论取消 PR 自动 DeepSeek 审查；整体产品进度更新为 24% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；5173/5174 被占用后使用 `npm run dev -- --host 127.0.0.1 --port 5173` 自动落到 5175，`curl -I http://127.0.0.1:5175/`、`/manifest.webmanifest`、`/sw.js` 和 `/main.js` HTTP 200 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 1-B 前端已知缺口修复：扫描页不再向用户展示 OCR endpoint，改为未接入手动输入提示；分析页空输入提交会提示且不跳转；详情页缺失成分 ID 渲染暂未收录页并带搜索/数据纠错预填入口；收藏空态引导搜索；搜索无结果展示热门分类入口；补充 `getCategoryStats()` 服务别名、回归断言并更新 PWA cache v15；整体产品进度维持 23% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 完成 `CODEX_TASKS.md` Batch 0-A 测试阻断修复并确认 Batch 1-A 食品数据扩充：食品添加剂草稿数据从 50 条扩充到 100 条，新增防腐剂、甜味剂、着色剂、增稠剂、乳化剂、膨松剂、抗氧化剂、香料类和其他类共 50 条，覆盖花青素、姜黄素、辣椒红、苋菜红、亮蓝、焦磷酸钠、三聚磷酸钠、木糖醇、麦芽糖醇和赤藓糖醇；`usageLimits` 继续保持空数组，来源校验补充 URL 和检索日期要求，并修正短词分析误命中色素的边界；整体产品进度更新为 23% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 新增成分表分析置信度闭环：真实包装成分表支持 `配料：` 前缀、复配添加剂括号展开、剂量/百分比后缀清理，分析结果返回匹配原因、置信度和覆盖率，分析页展示解析质量、低置信和暂未收录核对提示，补充移动端样式、PWA shell 缓存更新和测试；整体产品进度更新为 22% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5181/`、`/main.js`、`/pages/analyzePage.js`、`/services/ingredientService.js`、`/utils/text.js`、`/styles.css` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增分享闭环：详情页、报告详情和成分对比支持 Web Share，桌面或不支持系统分享时自动复制分享文本，补充分享 payload 服务、移动端入口、PWA shell 缓存更新和测试；整体产品进度维持 21% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5180/`、`/main.js`、`/pages/detailPage.js`、`/pages/reportsPage.js`、`/pages/comparePage.js`、`/services/shareService.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增搜索拼音与纠错辅助闭环：新增本地搜索辅助索引，食品添加剂和化妆品搜索支持拼音、首字母、常见误写和近似匹配，搜索页展示“可能相关”候选，补充移动端样式、PWA shell 缓存更新和测试；整体产品进度维持 21% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5179/`、`/main.js`、`/pages/searchPage.js`、`/services/ingredientService.js`、`/data/searchAliases.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增数据纠错反馈闭环：详情页和数据来源页可带入数据纠错草稿进入支持中心，支持中心解析 query 预填问题类型、标题、描述和联系方式，保留默认 `bug-feedback` 类型，保存后清理预填 query，补充移动端样式、PWA shell 缓存更新和测试；整体产品进度更新为 21% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5178/`、`/main.js`、`/pages/supportPage.js`、`/pages/detailPage.js`、`/pages/dataPage.js`、`/services/supportService.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增隐私与条款产品闭环：新增 `/legal` 合规中心、隐私政策/服务条款/订阅说明/数据安全/内容来源草案、设置页/会员中心/支持中心/页脚入口、页脚入口跟随当前类别、无效文档 404、移动端样式和 PWA shell 缓存更新；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5178/`、`/main.js`、`/pages/legalPage.js`、`/data/legalContent.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增支持中心产品闭环：新增 `/support` 路由、本机反馈记录、订阅/数据纠错/扫描分析/隐私数据/功能问题类型、复制/删除/清空、设置页和会员中心入口、本机数据导出导入联动、移动端样式和 PWA shell 缓存更新；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5177/`、`/pages/supportPage.js`、`/services/supportService.js`、`/data/supportTopics.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 继续修复 PR #34 审查问题：本机成分对比导入、读取和新增时先校验类别必须是受支持的产品类别，避免 `cosmetic` 等拼写错误类别被化妆品 fallback 保留但无法在页面显示或清理；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 继续修复 PR #34 审查问题：读取旧版本机对比列表时同样过滤无法解析的 stale ID，避免历史脏 localStorage 占用名额并阻塞新增有效成分；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 继续修复 PR #34 审查问题：本机数据导入时丢弃无法解析的成分对比项，避免 stale ID 占用 4 个名额导致页面为空但无法继续添加有效成分；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 修复 PR #34 审查问题：本机数据导入时按类别截断成分对比列表，避免 JSON 快照绕过同类别最多 4 个成分的限制；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 新增成分对比产品闭环：新增 `/compare` 路由、本机对比列表、搜索/详情/收藏加入对比入口、横向对比表、移出/清空/空状态、移动端样式和 PWA shell 缓存更新；整体产品进度维持 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/pages/comparePage.js`、`/services/compareService.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增会员中心前端闭环：新增 `/membership` 路由、Free/Pro 套餐说明、本机用量、购买/恢复/管理订阅未接入提示、设置页入口、移动端样式和 PWA shell 缓存更新；整体产品进度更新为 20% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/pages/membershipPage.js`、`/services/membershipService.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 修复 PR #32 审查问题：首次启动引导完成或跳过后，无 hash 冷启动会进入已保存的默认类别，不再固定回食品首页；整体产品进度维持 19% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/main.js` HTTP 200 |
| 2026-06-11 | 新增首次启动引导闭环：新增 `/onboarding` 路由、首页未完成提示、默认类别/过敏原/搜索历史隐私偏好/使用边界确认、跳过状态、本机快照导出导入和 PWA shell 缓存更新；整体产品进度更新为 19% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/pages/onboardingPage.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 继续修复 PR #31 审查问题：导入报告 ID 归一化为安全 slug，AI fallback 和报告检索补齐旧数据/异常对象防御；整体产品进度维持 18% | Codex | `npm run test`、`npm run lint`、`npm run validate:data`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 修复 PR #31 审查问题：清空本机数据时保留已关闭的搜索历史记录偏好，报告历史检索支持按过敏原中文展示名命中；整体产品进度维持 18% | Codex | `npm run test`、`npm run lint`、`npm run validate:data`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 新增本地报告历史检索闭环：报告列表支持按标题、原始文本、匹配成分、过敏原和解读文案关键词检索，路由 `q` 参数保留检索状态，并更新 PWA shell 缓存版本；整体产品进度维持 18% | Codex | `npm run test`、`npm run lint`、`npm run validate:data`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 新增本地报告来源引用闭环：报告详情展示当前匹配成分对应的数据来源、覆盖成分和草稿审核状态，Markdown/JSON 导出同步带出来源引用，并更新 PWA shell 缓存版本；整体产品进度维持 18% | Codex | `npm run test`、`npm run lint`、`npm run validate:data`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 新增搜索历史隐私开关闭环：设置页支持关闭自动记录搜索历史，关闭后搜索不会写入新历史，首页展示隐私状态提示，本机数据导出/导入会保留该偏好；整体产品进度更新为 18% | Codex | `npm run test`、`npm run lint`、`npm run validate:data`、`npm run build`、`git diff --check` 通过 |
| 2026-06-11 | 新增本机数据导入恢复闭环：设置页支持选择 JSON 快照并确认覆盖导入，store 原子校验 schema 和归一化收藏、历史、过敏原、报告、扫描草稿，导入后刷新摘要和过敏原勾选状态；整体产品进度维持 17% | Codex | `npm run test`、`npm run lint` 通过 |
| 2026-06-11 | README 新增“任务执行粒度与完整闭环要求”，明确后续任务必须按可验证用户流程闭环推进，并同步补充纯文档修改的差异检查命令；产品进度不变 | Codex | 文档修改，`git diff --check` 通过 |
| 2026-06-11 | 新增 OCR 协议层与扫描页状态展示：定义 OCR 协议版本、服务端 endpoint 占位、请求 payload、输出 contract、响应校验和本地 fallback，扫描页展示协议版本、endpoint 和文件上限；整体产品进度维持 17% | Codex | `npm run test`、`npm run lint` 通过 |
| 2026-06-11 | 分析页接入 AI 协议本地 fallback 展示：有输入时显示协议版本、服务端 endpoint 占位、本地库匹配/数据边界、风险叙述、成分笔记、下一步和使用边界；空输入不展示 AI 面板；整体产品进度维持 17% | Codex | `npm run test`、`npm run lint` 通过 |
| 2026-06-11 | 新增 AI 分析协议层：定义协议版本、服务端 endpoint 占位、请求 payload、输出 contract、响应校验和本地 fallback，并补充有效/无效响应测试；整体产品进度维持 17% | Codex | `npm run test`、`npm run lint` 通过 |
| 2026-06-11 | 新增本地报告 v2 解读区块：保存报告时生成风险分布、过敏原提醒、数据边界和下一步建议，报告详情与 Markdown/JSON 导出同步展示，并为旧版本地报告自动补齐解读；整体产品进度维持 17% | Codex | `npm run test`、`npm run lint`、`npm run validate:data`、`npm run build` 通过 |
| 2026-06-11 | 新增设置页本机数据与隐私控制：展示收藏、历史、报告、扫描草稿和过敏原数量，支持导出本机 JSON 快照和确认后一键清空本机数据；补充 store 摘要/快照/清空测试，整体产品进度更新为 17% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/pages/settingsPage.js`、`/store/userStore.js` 和 `/main.js` HTTP 200 |
| 2026-06-11 | 新增数据来源与审核状态页：增加 `/data` 路由、桌面导航入口、首页数据状态跳转、来源/版本聚合服务、来源清单/审核状态/分类覆盖展示和相关测试；整体产品进度更新为 16% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/pages/dataPage.js`、`/services/ingredientService.js` 和 `/sw.js` HTTP 200 |
| 2026-06-11 | 新增 PWA 离线基础：主入口注册 service worker，缓存核心静态资源、页面模块、数据模块和工具模块，导航请求离线时回退首页；补充 service worker 注册与缓存清单测试，整体产品进度更新为 15% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/sw.js` 和 `/main.js` HTTP 200 |
| 2026-06-11 | 新增独立扫描页基础闭环：移动端扫描入口改为 `/scan`，页面支持拍照/相册选择、图片预览、旋转预览、移除图片、OCR 降级反馈、可编辑校正文本、本地草稿自动保存/恢复并跳转成分表分析；扫描预览限制为常见 raster 图片类型并校验 8 MB 大小；同步 PWA 扫描快捷方式、路由测试和进度到 14% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5173/`、`/pages/scanPage.js` 和 `/utils/imageFile.js` HTTP 200 |
| 2026-06-10 | 修复 PR #25 AI Review 工作流失败：为 PR 评论发布补充 `issues: write` 权限，并将审查脚本改为使用 GitHub REST issue comments 接口发布评论，避免 `gh pr comment` 在 Actions 中出现 GraphQL 认证失败 | Codex | `python3 -m py_compile scripts/ai-review.py`、`npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过 |
| 2026-06-10 | 修复 PR #25 审查问题：保护 `单，双...` 类添加剂名称中的内部逗号，避免成分表分析把 E471 拆分并误命中甘油；同时将松散名称匹配改为最佳得分匹配，补充回归测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/services/ingredientService.js` HTTP 200 |
| 2026-06-10 | 新增食品数据审核状态展示：服务层生成数据审核摘要，食品首页展示草稿数量、分类数、已复核/验证数和限量覆盖，搜索页和详情页提示草稿审核边界，并补充服务与渲染测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/`、`/pages/homePage.js` 和 `/pages/detailPage.js` HTTP 200 |
| 2026-06-10 | 食品添加剂种子数据从 36 条扩充到 50 条，达到 MVP 数量下限，新增酸度调节剂、防腐剂、抗氧化剂、稳定剂和抗结剂常见项；同时修正食品成分表分析 summary 的类别语境，补充 50 条分页、分类统计、E-number/INS 搜索和食品 summary 测试；数据治理完成度更新为 16%，整体产品进度更新为 13% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/data/foodAdditives.js` HTTP 200 |
| 2026-06-10 | 食品添加剂种子数据从 24 条扩充到 36 条，新增甜味剂、增稠剂、乳化剂、防腐/护色剂和酸度调节剂常见项，并补充高关注筛选、E-number/INS 搜索、分类统计和食品文本分析测试；数据治理完成度更新为 12%，整体产品进度更新为 12% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/data/foodAdditives.js` HTTP 200 |
| 2026-06-10 | 食品添加剂种子数据从 12 条扩充到 24 条，新增着色剂、增味剂、膨松剂、保湿剂、稳定剂等常见类别，并补充 E-number/INS 搜索、分类统计和食品文本分析测试；数据治理完成度更新为 8%，整体按完整上线口径仍记录为 11% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/data/foodAdditives.js` HTTP 200 |
| 2026-06-10 | 搜索结果新增分类分布筛选：结果区按当前关键词和风险筛选统计分类数量，支持点击分类快速筛选，并在排序状态下保留 `sort` 参数；整体产品进度按权重更新为 11% | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/searchPage.js` HTTP 200 |
| 2026-06-10 | 详情页功能分类芯片新增导航：成分类别芯片跳转到精确分类筛选，功能词芯片跳转到关键词搜索，补充食品详情页链接渲染测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/detailPage.js` HTTP 200 |
| 2026-06-10 | 搜索结果新增风险分布筛选：结果区按当前关键词和分类筛选统计关注等级数量，支持点击风险等级快速筛选，并在排序状态下保留 `sort` 参数 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/searchPage.js` HTTP 200 |
| 2026-06-10 | 搜索结果新增排序能力：搜索页支持默认排序、关注等级优先和中文名排序，路由读取 `sort` 参数，表单提交和分页链接保留排序状态，并补充路由与渲染测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/searchPage.js` HTTP 200 |
| 2026-06-10 | 首页常见分类改为真实分类筛选入口：服务层新增分类摘要和风险计数，首页分类 chip 显示数量并跳转到 `ingredientCategory` 筛选，补充渲染和服务测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/homePage.js` HTTP 200 |
| 2026-06-10 | 新增详情页相关成分推荐：服务层按分类、共同功能、适用食品类别、过敏原和人群提醒计算关联分数，详情页展示可点击关联卡片和关联理由，并补充食品/化妆品测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/detailPage.js` HTTP 200 |
| 2026-06-10 | 搜索结果分页基础实现：搜索页支持 `page` 参数、每页 6 条结果、上一页/下一页和页码链接，并保留当前关键词和筛选条件 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/pages/searchPage.js` HTTP 200 |
| 2026-06-10 | 新增搜索建议基础能力：首页和搜索页输入框支持热门/匹配建议，覆盖中文名、英文名、别名、E-number、GB/INS 和分类匹配，并补充服务层和页面渲染测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/services/ingredientService.js` HTTP 200 |
| 2026-06-10 | 新增报告导出能力：报告详情页支持 Markdown 预览、复制 Markdown、下载 Markdown 和下载 JSON，并补充导出服务与测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/` 和 `/services/reportExportService.js` HTTP 200 |
| 2026-06-10 | 新增本地分析报告功能：分析页可保存报告快照，报告列表/详情支持查看、删除、清空和重新分析，并补充路由、首页入口、导航和测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`git diff --check` 通过；`curl -I http://127.0.0.1:5175/`、`/main.js`、`/styles.css` HTTP 200 |
| 2026-06-10 | 新增移动端 Web Shell：底部主导航支持首页、扫描、搜索、收藏和我的五个入口，按当前类别同步链接和 active 态，并补充 PWA manifest、应用图标和相关测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过；5173/5174 被占用后使用 `http://127.0.0.1:5175/` 验收，首页、manifest、SVG 图标 HTTP 200 |
| 2026-06-10 | 按 iOS/Android 上线和付费订阅目标重构项目计划，补充移动端技术路线、账号/订阅/权益、商店审核、交互原则和新版里程碑，并将完整产品进度校准为 8% | Codex | `npm run lint` 通过 |
| 2026-06-10 | 最近查询支持单条删除，详情页标题显示具体成分名，并补充历史删除、首页历史渲染和标题测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 顶部导航改为类别感知链接，食品/化妆品上下文中分别指向对应搜索、分析、收藏和设置页，并补充导航 active 态和测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 搜索页新增关注等级和成分分类组合筛选，支持无关键词按筛选条件浏览，并补充筛选 URL、服务层和页面渲染测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 修正 README 早期环境变量示例，移除旧 `VITE_` 前缀口径，并关闭项目计划中的对应已知缺陷 | Codex | `npm run lint` 通过 |
| 2026-06-10 | 新增未知路由 404 页面，路由切换同步页面标题，并将 SPA 焦点移动到主内容区；补充路由、404 和标题测试 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 新增过敏原设置页，支持 14 类标准过敏原选择、保存、清空，并接入导航、路由和测试 | Codex | `npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 修复 PR #10 自动审查问题：移除 ADI 全文搜索、来源链接增加 http/https 白名单、删除未审核限量占位、详情页明确草稿未审核状态 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 完成食品详情页专用字段基础展示，支持 E-number、GB/INS 编号、GB 状态、ADI、食品类别、使用限量空态和来源引用 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 新增 12 条食品添加剂草稿种子数据，支持 E-number/INS 搜索和食品详情页法规字段展示，同步更新测试、命令文档和进度口径 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build`、`curl -I http://127.0.0.1:5173/` 通过 |
| 2026-06-10 | 修复 PR #6 审查问题：类别感知收藏、过敏原读写和警告基础逻辑、`dataCategory` 校验、legacy 路由和 html 转义约定说明 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 完成多类别路由基础版，支持 `/food/...` 和 `/cosmetics/...` 路径、首页类别切换、类别化搜索/分析链接和旧路径兼容 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 修复 PR 审查指出的 storage 写入异常、括号注释剥离、收藏页内联取消和 `FoodAdditive.sourceNote` 必填口径问题 | Codex | `npm run validate:data`、`npm run lint`、`npm run test`、`npm run build` 通过 |
| 2026-06-10 | 完成食品添加剂 schema、标准过敏原枚举、空食品数据入口和数据校验脚本，项目总进度从 2% 更新为 3% | Codex | `npm run validate:data`、`npm run lint`、`npm run test` 通过 |
| 2026-06-10 | 将项目计划改为真实进度审计版，按完整产品口径记录总进度 4%，补充模块级、功能级已实现和待实现清单 | Codex | 文档修改，未运行代码测试 |
| 2026-06-10 | 新增项目进度与阶段计划文档，补齐 README 第 23 节要求 | Codex | `npm run lint`、`npm run test`、`npm run build`、首页启动检查通过 |
| 2026-06-10 | 项目英文名改为 CompCheck，中文名改为成分小查 | Codex | `npm run lint`、`npm run test`、`npm run build`、首页启动检查通过 |
| 2026-06-10 | 审查代码与文档一致性，补全遗漏功能项，新增已知代码缺陷章节，修正 M0 里程碑状态为已完成 | Claude | 文档修改，`npm run lint`、`npm run test`、`npm run build` 验证通过 |
| 2026-06-10 | 确认产品方向：食品添加剂为主线、化妆品为并行类别、过敏原用户档案为核心功能；重写项目目标、进度权重表、模块总表、数据字段规划、里程碑，总进度从 4% 校准为 2% | Claude | 文档修改，无代码改动 |

## 11. 维护规则

每次编码 Agent 修改项目后，必须同步检查并更新 `PROJECT_PLAN.md`。

如果本次修改影响了项目目标、阶段进度、已完成功能、未完成功能、下一步计划或验收状态，必须同步更新 `PROJECT_PLAN.md`。

如果本次修改完成了某个功能模块，必须更新对应模块状态和进度。

后续更新进度时必须遵守：

- 不允许只按页面完成度计算总进度。
- 总进度必须包含数据、移动端工程、后端、账号、付费、OCR、AI、测试、部署、商店上线、合规和运营。
- “入口已预留”不能写成“功能已完成”。
- “本地示例数据可用”不能写成“数据体系完成”。
- “前端显示会员状态”不能写成“付费已完成”，必须有 Apple/Google 沙盒购买、恢复购买和服务端权益校验。
- “移动端响应式页面可打开”不能写成“iOS/Android 已完成”，必须有真机安装、权限、构建和商店测试轨道验收。
- 每个完成度必须能对应到代码、测试、文档或验收记录。
