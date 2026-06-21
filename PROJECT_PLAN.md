# Project Plan — CompLens / 成分镜（CompCheck）

## 1. 当前产品定位

**CompLens / 成分镜 是面向普通消费者的食品配料表 / 营养成分表拍照解读与消费决策助手。**

核心主路径：

```
首页单一拍包装入口
→ 拍食品包装 / 条码 / 二维码 / 配料表 / 营养成分表 / 生产日期，或手动输入
→ 图片内容自动分类 / OCR 识别 / 文本清洗 / 有效标签提取
→ OCR 成功自动生成结果，失败或信息不足时手动补充
→ 配料拆分 / 添加剂识别 / 营养字段解析
→ 本地解读规则 + 我的关注项（控糖 / 儿童 / 过敏）
→ 生成食品标签解读报告（一句话结论 / 关键原因 / 营养重点图 / 添加剂解释 / 识别详情）
→ 保存扫描记录
```

当前 P0 主路径仍是一个“拍包装”入口，不新增扫码/条码/二维码独立入口。用户拍到配料表或营养成分表时优先按包装实拍 OCR 生成报告；用户只拍到商品条码、二维码或印刷商品编码时，系统先记录商品身份信息并查本机历史，必要时通过后端 DeepSeek 商品补全接口获取公开标签线索，失败则提示继续补拍配料表或营养表。添加剂识别是核心能力，配料解释是理解过程，营养分析服务于购买/食用判断，食品标签解读报告是最终输出。当前阶段仍以食品标签为实现边界，不混入化妆品、护肤品、药品或日化规则判断；首页主按钮直接拉起相机，OCR/识别成功后自动生成结果，失败或信息不足才进入输入页；后端 RapidOCR 已兼容常见 `text/raw_text/rawText` 返回字段；`POST /api/food/analyze` 由本地规则先给购买/食用决策，再通过 DeepSeek 优先的 AI Provider 网关做大众化解释，失败时 fallback 到规则结果；报告页改为“一句话结论 / 关键原因 / 适合谁 / 不适合谁 / 添加剂解释 / 建议吃法 / 识别详情”，并在报告首部展示统一识别信息卡，识别详情默认折叠并包含商品码、二维码、品牌、商品、类型、生产日期、配料表、营养表和未确认线索；设置与说明页已从小程序页面清单移除。

后续 P1/P2 继续增强真机条码/二维码图片解码 provider、外部商品库授权和数字标签规范化解析，但不改变“一个拍包装入口、系统内部自动判断”的产品形态。当前商品码解析级和合成 PNG 图片级工程门禁已通过；真实包装照片和微信真机扫码仍需单独验收。当前识别分支无法获得完整配料时，只提示用户可以重新拍摄包装其他区域或手动补充，不自动跳转，也不把条码、二维码、OCR 设计成串行流程。

---

## 2. 当前最高优先级

> ⚠️ **优先级已按方向修订（2026-06）重排，以 [`docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md`](docs/product-blueprint/PRODUCT_DIRECTION_2026H2.md) 为准。** 重心从"数据有多全"转回"普通人有没有看懂、用没用起来"。

```
第一版（微信小程序单端，验证需求）
1. OCR 拍照识别主流程（保留自建 RapidOCR）
2. OCR 文本确认与修正
3. 配料拆分 + 营养字段解析
4. 添加剂通俗解释（精选词表，约 150–300 条；新增核心 P0）
5. 我的关注项（控糖 / 儿童 / 过敏 三套先行）
6. 食品标签解读报告（一句话结论 + 关键原因图表 + 添加剂解释）
7. 历史 / 收藏
8. 微信小程序工程交付与真机验收

第二版（建立复用与差异化）
9. 比一比（双品对比）
10. 报告分享摘要（拉新）
11. 家庭多档案 / 自定义忌口黑名单

第三版（深度与付费）
12. H5 / Android / iOS 扩端（小程序验证成功后）
13. 历史趋势 / 进阶人群关注模板
14. AI 兜底解释（生僻成分，非主链路）
15. 登录、云同步
16. 订阅、支付、上架
```

**正式取舍（相对旧规划降级 / 暂停，详见方向修订文档第 5 节）**：

- GB2760 全量导入 + 7 级可信状态 + 人工复核流水线 → **暂停继续投入**，已有成果转为"添加剂大白话词表"来源。
- admin-web 运营 / 数据治理后台 → **暂停建设**。
- 专业法规查询入口 → **砍 / 深埋**。
- 多端齐头并进 → **收敛为微信小程序单端优先**。
- 旧 `src/` 纯 JS 原型 → **冻结**。

订阅、支付、上架不排在核心闭环前；登录/云同步不阻塞本地 MVP；AI 不作为主链路；OCR 是核心主路径；专业法规和数据库证据默认服务“查看依据”，不抢占消费者报告第一屏。

---

## 3. 当前真实进度

整体产品进度：**约 90%**（按数据底座 + OCR 主路径闭环 + 正式用户端迁移 + 微信小程序工程对接 + 后端/API/admin-web 架构规划口径）。

| 里程碑 | 名称 | 状态 | 完成度 |
|---|---|---|---|
| M1 | 数据源准确性 + GB2760 可追溯导入 | 🔄 进行中 | ~95% |
| M2 | 数据库真实对接（本地完成，生产待补） | 🔄 进行中 | ~80% |
| M3 | OCR 拍照识别主流程（manual/mock/本机 RapidOCR 闭环，Aliyun provider 已实现；首页拍照直达相机，OCR 成功后自动生成结果；失败和手动场景保留输入页；食品包装非条码/二维码 OCR 500 样本门禁已达 `stable_500`，`494/500`、`98.8%`、Codex 子 agent 和 DeepSeek Review 均通过） | 🔄 进行中 | ~96% |
| M4 | 配料解析 + 数据库匹配 | 🔄 进行中 | ~72% |
| M5 | 食品标签解读报告（配料 + 营养 + 关注项） | 🔄 uni-app MVP 已落地，报告第一屏改为“一句话结论 + 你的关注短标签 + 为什么 / 谁少吃 / 怎么吃”购买/食用决策卡，关键原因优先级列表 + 低/中/高营养重点图已接入，识别详情默认折叠，信息不足不硬凑完整结构并前置补拍/手动粘贴动作，后端 `reports/label` 与 `food/analyze` 文案口径已对齐 | ~88% |
| M6 | 我的关注项、产品档案、收藏、历史、个性化 | 🔄 uni-app 本地 MVP 已落地，扫描记录页、收藏筛选、关注项筛选、最近记录和报告页小反馈入口已接入；设置与说明页不再注册到小程序 | ~78% |
| M7 | 消费者体验与信息架构优化（UX） | 🔄 uni-app 主路径已迁移，P0 H5 可用性截图自测已覆盖；首页主拍照入口、搜索弱入口、报告信息层级、历史页、我的页、大众化文案、纠错反馈、ChatGPT 会话子评审和 DeepSeek 综合评审已按最新方向收口，最终 `shipBlockers=[]` | ~90% |
| M8 | 移动端 / PWA 体验 | 🔄 uni-app H5/小程序构建通过，小程序工程对接与导入说明已补，首页、拍照、搜索、我的、报告、历史已注册并通过视觉烟测；条码 / 二维码 / 商品数字码解析级各 500 用例已通过，条码 / 二维码合成 PNG 图片级工程门禁已通过，真实包装照片和微信真机扫码仍需真机/平台能力验收 | ~80% |
| M9 | AI 总结解释（本地 fallback 可用，DeepSeek smoke 已通过） | 🔄 AiProvider 抽象、Mock/DeepSeek/OpenAI-compatible、FoodAnalyzeService、规则优先和进程内缓存已落地；`deepseek-v4-flash` 真实 smoke 与 UI 评审通过，生产监控和成本统计待配置 | ~60% |
| M10 | 登录、云同步（本地完成，跨设备验收待补） | 🔄 进行中 | ~40% |
| M11 | 订阅、支付、上架 | ⏸ 后置 | 0% |
| M12 | 统一跨端技术栈（uni-app / admin-web / backend 复用） | 🔄 用户端工程已创建，后端 API 边界和后台工程边界已规范化 | ~58% |
| M13 | 后台管理系统（运营 + 数据治理 + 系统 + 审计） | 🔄 admin-web 工程边界、后台菜单 IA、数据治理、用户反馈、内容运营、OCR/AI 监控、系统配置和权限审计页面/API 计划已规划 | ~40% |

数据底座真实口径（详见 `DATA_SOURCES.md`）：

- 食品基础库 DB 当前 329 条：`verified_regulation` 308、`verified_jecfa` 1、`common_ingredient` 12、`unverified` 8；源文件静态 seed 仍为 112 条，`validate:data` 继续校验源文件口径。
- GB2760 官方 PDF：264 页全文入库；表 A.1 第 8-148 页 → 2404 行 staging（后端 DB 2391 行已人工签核并 `promoted`，13 行历史 `verified`，缺映射 0）；A.2/B/C/D/E/F → 2800 行参考表，边界已修复；`source_documents` / `import_runs` / `import_errors` 导入审计骨架已落地；`additive_usage_rules`、`promote:gb2760` 与 `validate:gb2760` 已落地，当前正式规则 2391 行、错误数 0；内部复核写接口已加 `GB2760_INTERNAL_REVIEWERS` allowlist 和 reviewer 审计字段。
- 食品成分知识库扩展层：已新增 `official_sources`、`ingredient_master`、`ingredient_aliases`、`ingredient_source_relations`、`ingredient_regulatory_rules`、`ingredient_relations`、`ingredient_type_tags`、`ingredient_import_staging`、营养强化剂/营养/过敏原/菌种/新食品原料/食药物质规则表和统一 CLI；本轮实际写入本地开发 DB，当前 `ingredient_master=3041`、`ordinary_ingredient=480`、`food_microorganism=40`、`other=81`、`ingredient_aliases=8735`、`ingredient_source_relations=5631`、`ingredient_type_tags=3033`、`ingredient_regulatory_rules=2587`、`nutrition_fortifier_rules=116`、`nutrition_reference_values=32`、`nutrition_claim_rules=15`、`official_sources=15`、`ingredient_import_staging=462`；已补齐三新食品、食药物质和通用食品菌种目录的 NHC 官方公告页/附件 URL，并用 `ingredient:promote-reviewed` 将 S0/证据完整成分提升为正式层，DB 当前 `verified_regulation=2452`、`pending_review ingredient=563`、`pending_review staging=198`、`current source relations=4426`；剩余待复核主要是 468 条 S2 普通配料、14 条 RapidOCR 辅助婴幼儿菌种、81 条 GB 2760 C.3 酶制剂来源/供体引用、营养声称阈值、数字标签和过敏原规则，覆盖报告见 `docs/official-food-data-coverage.md` 与 `docs/pending-review-promote-report.md`；官方材料管线已补 `failed_extract` / `failed_parse` 失败分层，单个 PDF 抽取或解析失败不会中断其他来源处理；`docs/decision-required.md` 已集中记录数字标签独立公告本地 HTML 保存失败和 GB 28050-2025 糖醇能量规则两个未确认缺口，未确认前不进入 verified。
- 这不是完整成分库，也不是完整 GB2760 法规库；正式库只接收高置信、可追溯、字段完整的 promote 数据。

---

## 4. 已完成

- 后端 Hono/TS + Drizzle/PostgreSQL schema、迁移、seed、Docker Compose（本地/开发环境）。
- 成分 API：列表/详情/分类/搜索/批量匹配/可信等级筛选。
- 前端优先 API、失败降级本地 seed 并显示未验证标识。
- 数据溯源字段：`dataStatus`/`matchConfidence`/`sourceScope`/`sourceName`/`sourceVersion`/`sourceUrl`/`regulatoryBasis`/`rawSourceText`/`lastReviewedAt`/`reviewNote`/`isVerified`。
- GB2760 官方来源确认 + 264 页全文 + 2404 行 A.1 staging + 2800 行参考表（边界修复完成）+ 导入审计骨架（来源文档、批次、错误表和查询接口）+ `additive_usage_rules` 正式规则表 + `promote:gb2760` 准入脚本 + 本轮人工签核 promote 2391 条正式规则 + `validate:gb2760` 数据准入校验。
- 成分详情页 GB2760 官方证据展示（Batch 1-E）：详情页可折叠查看 staging 与 reference 证据、状态边界说明、来源摘要与来源链接，完成用户端官方依据可视化闭环。
- OCR 主路径：拍照/上传入口、图片预处理（EXIF/压缩/IndexedDB）、OCR manual/mock/real-provider 抽象、文本确认页、配料解析、批量匹配；后端 `OCR_PROVIDER=mock` 可返回明确标注的 mock OCR 结果，`OCR_PROVIDER=rapidocr` 已接入本机 `/home/downloads/tools/complens-ocr` 服务，`OCR_PROVIDER=aliyun` 已实现阿里云通用文字识别签名调用，真实生产验收待后端凭证。
- 平台能力：`src/` 扫描流程补齐 `PLATFORM-B` 平台适配口径，统一 `capturePhoto` / `pickImage` / `compressImage`，并把主流程改为适配层调用、Web 降级走文件选择。
- 平台本地存储：`src/services/storageService.js` 增加跨平台设置存储后备（兼容微信/Web 本地存储），`src/services/imageStoreService.js` 补齐图片清理接口并接入本机数据清空链路，`src/services/ingredientApiService.js` 与 `src/main.js` 统一走存储适配层读写，不再直接访问 `localStorage`。
- 消费者标签后端 API：`POST /api/labels/classify` 已落地，支持配料表、营养成分表、包装正面、产品名/条码和未知标签识别，允许匿名调用；`user-uniapp` 标签 adapter 已从 mock-only 改为后端优先、本地规则降级。
- 分析报告：整体评级、关注摘要、配料顺序、添加剂分类、未收录、特殊人群、来源说明、Markdown/JSON 导出、分享、历史。
- 产品档案 + 收藏 + 历史 + 个人关注/忌口/过敏原 + 全局高亮 + 登录态云同步。
- 前端登录/注册 + 访客模式 + JWT 管理 + 本机数据登录态同步。
- 移动端底部导航 + PWA 安装/离线基础 + 数据治理页人工校验队列。
- loading / empty / error 状态统一复核：搜索初始空态提供拍照/粘贴入口，GB2760 复核页和参考表错误态均有重试，复核空态有重置为待复核行/返回数据页出口。
- 统一结果可信表达映射层：`src/utils/dataStatus.js` 统一 `verified_regulation` / `verified_jecfa` / `pending_review` / `mapped_candidate` / `common_ingredient` / `unverified` / `unknown_from_ocr` 的文案、颜色变量、Badge class 和 normalize 逻辑；搜索、详情、分析、报告、导出、数据治理页已引用。
- 产品蓝图文档集：`docs/product-blueprint/` 已覆盖产品、设计系统、视觉、前端、页面、跨端、API、数据可信、UI 路线、后台、隐私、测试验收；2026-06-15 已二次复核并同步 `CODEX_TASKS.md` / `AGENTS.md` / `COMMANDS.md` / `DATA_SOURCES.md`。
- 消费者食品标签解读规划：已新增 `CONSUMER_DECISION_SPEC.md` 与 `CONSUMER_UX_SPEC.md`，明确产品从“配料表识别/添加剂查询”升级为“食品标签拍照解读 + 消费决策助手”。
- 统一架构规划：已新增 `ARCHITECTURE_SPEC.md`，明确正式用户端 `user-uniapp`（uni-app + Vue3）、后台 `admin-web`（Vue3 + TDesign Web）、复用现有 `backend/`（Hono + Drizzle + PostgreSQL）、OCR 服务链路（后端调用 Python FastAPI + RapidOCR），并规定旧 `src/` Vite 前端只作为历史原型和迁移来源。
- 后端 API 框架规范化：已核对 `backend/src` 真实结构，确认继续复用 Hono 单后端；`ARCHITECTURE_SPEC.md` / `API_CONTRACT.md` 已补 routes/services/db/provider 分层边界、计划接口状态和 labels/nutrition/reports 后端化顺序。
- 后台管理端规划：已明确 `admin-web/` 独立工程边界、目标目录结构、工作台路由分组、后台 API 落地边界、MVP/非 MVP 范围、完整后台信息架构、数据治理 MVP 页面/API 复用矩阵、用户/扫描/报告/产品档案/反馈管理页面/API 边界、公告/Banner/FAQ/数据说明/法律文档版本管理边界，以及 OCR/AI Provider 监控、系统配置与功能开关、权限与审计页面/API 边界；当前仍未创建工程，支付/订阅/上架继续人工阻塞。
- 正式用户端迁移 MVP：已新增 `user-uniapp/`（uni-app + Vue3），迁移首页、拍照/上传、OCR 降级、标签类型选择、文本确认、配料拆分、营养解析、匹配确认、食品标签解读报告、历史、我的关注项、搜索、数据说明、隐私说明；集中建立设计 token、基础组件、API client、平台适配层和本地草稿/报告存储；微信小程序已补 AppID 环境注入、相机权限说明、平台文件缓存、OCR 图片压缩、报告转发和导入验收文档。
- 小程序 P0 稳定性补强：首页新增 Demo 体验入口但不引入商品库；新增 `ocrAdapter`、`labelTextExtractor`、`nutritionParser` 结构化摘要、`localLabelAnalysis`、`rulesLoader` 和本地调试样例；`capture` 增加阶段式 loading，`report` 增加 Demo 标识和反馈入口，历史记录限制最近 20 条且不保存图片数据。
- 小程序 P0 配料表 OCR 精准收敛：拍照页和上传框统一引导“只拍配料表区域”；`labelTextExtractor` 无锚点兜底必须满足配料清单形态，产品名、净含量、规格、厂家地址、条码、生产日期等包装信息只作为噪音过滤；营养提取要求营养锚点或“字段 + 单位”，避免配料里的糖类词误触发营养表；RapidOCR `bounds.points` 会转换为矩形坐标供标准化排序。
- 小程序 P0 产品化收口：拍照/OCR 后清晰可生成结果自动进入报告，低置信、失败、手动输入或信息不足时进入文本确认 / 补充；新增扫描记录页并从我的关注页和报告页接入；报告页改为“食品标签解读”，首屏展示糖、钠、脂肪、能量、添加剂和过敏原重点提醒，补添加剂大白话、收藏、分享入口和识别文字折叠区；新增设置与说明页，覆盖图片/OCR、本机记录、使用边界和本机数据清空。
- 小程序 P0 OCR 与报告大众化收口：`labelTextExtractor` 进一步收紧目标字段，只保留配料表、带字段和值结构的营养成分、致敏原和少量明确包装声明；产品名、净含量、规格、厂家、地址、条码等不进入报告。包装声明-only 结果只展示“信息不足 / 还需要补充 / 未确认线索”，不再硬凑添加剂、营养或配料完整结构；报告页将 `mapped_candidate` / `pending_review` 单独放入“未确认线索”；移除“适合 / 少选 / 换成 / 决定频率 / 核验 / 阈值”等偏专业或购买倾向表达；已让独立 AI 子评审静态检查报告口径，并用 H5 样例验证包装声明和配料+营养两类报告。
- 小程序 P0 搜索结果与后端报告口径收口：`user-uniapp` 成分搜索卡片改为名称、类型、可信提示、为什么看、标签写法、数据来自和结果用途；后端 `/api/nutrition/parse` 要求真实营养字段数值才算解析成功，`/api/reports/label` 改用“糖线索 / 钠线索 / 营养数字已整理”等大众化表达，避免接口输出与前端报告文案漂移。
- 小程序 P0 产品输出审查门禁：新增 `user-uniapp/scripts/audit-product-output.mjs` 和根目录 `user:audit:product-output` 转发命令，固定搜索结果、报告描述、OCR 目标字段和添加剂大白话的字段完整性与文案边界；本轮同步清理添加剂提醒里的“普通人偶尔食用通常不用过度担心”等安抚式判断。
- 小程序 P0 H5 视觉烟测门禁：新增 `user-uniapp/scripts/visual-smoke.mjs` 和根目录 `user:visual:smoke` 转发命令，基于 H5 构建产物用 Playwright + 本机 Chrome/Edge 检查首页、拍食品标签、搜索、我的、报告、历史、设置的关键文案、非空渲染和横向溢出，并输出截图到系统临时目录。
- 小程序 P0 OCR 与报告信号二次收敛：报告决策、关注项、添加剂识别和过敏提醒不再直接扫描完整 OCR 识别文字，只使用目标字段和确认后的匹配；营养表-only 不展示添加剂大白话，未确认成分不进入正常添加剂解释，裸“含有”声明必须同时命中过敏原关键词。
- 小程序 P0 OCR/报告样本回归：新增 `user-uniapp/scripts/ocr-report-regression.mjs` 和根目录 `user:regression:ocr-report` 转发命令，用 6 个样本覆盖非目标包装字段、营养表-only、真实致敏原、未确认添加剂等边界。
- 小程序 P0 报告输出二次精简：报告页新增“营养数字”条形展示，糖/钠/脂肪/能量说明改为“包装标示 + 结果说明”的短句；前端、后端报告摘要和加载态同步清理“结合目标 / 不单独下结论”等低价值表达；产品输出审查新增对应禁用词。
- 小程序 P0 品牌与结果话术修正：统一小程序品牌为“成分镜”；报告、分享摘要、搜索结果和后端报告不再输出旧品牌、二次比对和旧首屏标题口径；报告首屏使用“结果摘要”，低置信内容使用“未确认线索”，原始 OCR 展示区使用“识别文字”，搜索字段使用“结果用途”；产品输出审查新增旧口径禁用词。
- 市面优秀食品扫描 / 营养 App 调研：新增 `docs/product-blueprint/MARKET_APP_ANALYSIS_2026.md`，拆解 Yuka、Open Food Facts、CodeCheck、Fooducate、MyFitnessPal、Cronometer 等产品的功能、优点和成分镜可吸收的优化点；结论明确继续坚持拍食品标签 OCR 主路径，优先吸收个性化关注、历史复用、营养图表、纠错反馈、条码 / 数字标签自动分支和比一比。
- 小程序 P0 拍照质量提示闭环：拍照上传区新增拍摄小检查；OCR 确认页新增“本次识别提示”，按低置信、过滤包装信息较多、只识别到营养表、只识别到包装声明、缺少配料表等情况给出下一步动作。
- 小程序 P0 OCR 结构化确认页：OCR 确认页改为配料表、营养数字、致敏原提示、包装声明四个确认卡片；每块显示已整理/可补充状态，支持单独清空并重新输入。
- 小程序 P0 历史页复用强化：历史筛选扩展为全部、收藏、关注项、最近；关注项筛选按报告重点命中、过敏提示、较高营养项和重点添加剂判断；历史记录支持直接复制分享摘要。
- 小程序 P0 报告纠错反馈队列：报告页新增结果反馈卡片，用户可标记识别错了、漏了内容、解释不清楚和其他问题并补充短备注；历史页新增快捷反馈；本机最多保留 50 条轻量反馈，不保存图片或整段识别文字，设置页展示反馈数量并随本机数据清空。
- 小程序 P0 反馈复查与导出：设置页新增反馈复查卡片，展示本机反馈类型分布和最近 3 条问题样本；支持复制最多 50 条轻量反馈清单，便于后续集中查看 OCR 误识别、漏内容和报告表达问题。
- 小程序 P0 产品主路径重排：首页去掉页面内品牌标题，主按钮改为“拍包装”并直接拉起相机；成分搜索降为首页小入口；OCR 成功后自动生成结果；报告页去掉独立分享摘要和大块反馈卡，改为“一句话结论 / 关键原因 / 营养重点图 / 适合谁与不适合谁 / 添加剂解释 / 建议吃法 / 折叠识别详情”；历史页和我的页精简信息层级。
- OCR 真实包装兼容修复：后端 RapidOCR Provider 兼容 `rawText` / `raw_text` / `text` 三种常见文本字段；前端 OCR/报告回归加入“小麻花整包照片”文本形态样本，覆盖“品 名 / 配 料”分栏、整包噪音、配料表和营养成分表同时存在的提取边界。
- 小程序 P0 上线前 UI/产品深度评审收口：新增 ChatGPT / DeepSeek 评审脚本；视觉 smoke 扩展到补充页空白/已填/可选、报告首屏、营养图、报告详情、信息不足报告等 11 个截图场景；报告首屏完成“结论 / 为什么 / 谁少吃 / 怎么吃”决策闭环，营养图加入低/中/高参考，首页搜索入口和历史页筛选进一步弱化/明确；ChatGPT 会话子评审与 DeepSeek 综合评审均为 `pass`、`shipBlockers=[]`。

---

## 5. 未完成

- 生产 Aliyun OCR / 真实 AI 接入（Aliyun adapter 已实现，真实生产 smoke 待后端凭证；本机 RapidOCR 已接入）。
- 标签类型识别后端 `POST /api/labels/classify` 与扫描会话 `POST /api/labels/scan` 已补齐；营养成分表结构化、我的关注项主路径化、食品标签解读报告后端化已在 `user-uniapp/` 完成 MVP；`nutrition/parse`、`reports/label` 后端正式 API 已落地并完成本轮大众化口径对齐，仍待真实后端部署、真实 OCR 样本回归和跨端真机验收。
- 单一拍照入口下的商品条码、二维码、数字编码、配料表、营养表自动识别分流已完成第一版；仍待微信真机条码/二维码图片解码 Provider、正式 GTIN/数字标签数据源和域名/合规确认。
- 外部 GTIN 商品数据源选择、数字标签页面解析规则、数据授权和域名/合规确认（人工+Codex）。
- 内部数据控制台 / GB2760 复核工作台后续 UI（用户要求等产品页面设计统一推进）。
- 移动端组件统一、首页/OCR 产品体验继续真机复核（阶段 7；统一可信表达映射层与报告页产品化收口已完成）。
- iPhone Safari、微信小程序开发者工具/真机、Android/iOS 真机验收（阶段 8/15）；微信小程序工程对接已补，仍需 AppID、request 合法域名和真机验收。
- 生产数据库、生产部署、跨设备真实验收、离线同步队列。
- 订阅、支付、上架（后置）。
- `admin-web/` 后台管理端工程尚未创建。
- 后端尚未完成后台用户/会员/订阅/公告/Provider 监控/配置/权限审计 API；当前只有 GB2760 数据治理部分接口已落地，其余后台能力仍是计划。

---

## 6. 当前人工阻塞

| 阻塞项 | 阻塞内容 | 是否阻塞核心 |
|---|---|---|
| GB2760 后续增量复核 | 新抽取或变更 staging 行再次 promote | 否：本轮 2391 条已 promote，后续增量继续人工复核 |
| 内部控制台 / 产品页面设计 | 用户要求内部控制台先不做，等产品页面设计统一推进 | 否：当前数据复核/promote 闭环已可用 |
| 生产 DATABASE_URL | 生产数据库（2-D） | 否：本地闭环可用 |
| 生产 Aliyun OCR API Key | 生产 OCR 真云端验收（3-E） | 否：Aliyun adapter、本机 rapidocr/manual/mock 闭环可用 |
| AI API Key | 真实 AI（9-B） | 否：本地 fallback 可用 |
| Apple / Google 账号 | iOS/Android 上架（11-B/C/D） | 否：已后置 |
| 法务复核 / 域名 / 部署平台 | 合规与生产（11-F/G） | 否：已后置 |

遇到阻塞按 `CODEX_TASKS.md` 人工阻塞处理规则：标记 `blocked_by_user`、记录原因、跳过、继续后续任务。

---

## 7. 下一步计划（当前阶段目标）

当前阶段：**阶段 16 用户端 uni-app 迁移落地 → 阶段 17 后台管理系统规划**。

当前策略：

1. 正式用户端采用 `user-uniapp`（uni-app + Vue3），目标覆盖 H5/PWA、微信小程序、Android、iOS。
2. 当前 `src/` 纯 JS + Vite 前端作为历史 Web/PWA 原型和迁移来源，不删除，但不继续承载复杂新业务。
3. 后台管理端采用 `admin-web`（Vue3 + TDesign Web），单独建设产品运营、数据治理、业务监控、系统配置、权限审计。
4. 后端 API 复用现有 `backend/`（Node.js + Hono + Drizzle + PostgreSQL），作为所有端唯一入口；不创建第二套 Express/Nest/Fastify 服务。
5. OCR 服务采用 Python FastAPI + RapidOCR 或 Aliyun OCR，由后端 Provider 调用，不暴露公网；生产可配置 Aliyun 后端凭证后切换。
6. 统一的是产品流程、design tokens、数据状态、API 契约、平台能力接口和文案规范，不强行一套 UI 代码覆盖所有端。

Codex 下一步任务：

1. 微信小程序用真实 AppID、HTTPS 后端 API 域名和微信开发者工具完成导入/真机验收。
2. 用真实后端环境和真实 OCR 样本回归 `nutrition` 与 `reports` API 输出，继续观察搜索结果和报告文案是否符合普通用户理解；扫描会话接口后续补充 `admin-web` 扫描记录与导出能力。
3. ADMIN-E 会员订阅/支付继续人工阻塞；后台 `admin-web/` 工程和后台 API 代码仍待后续批次按计划落地。
4. `CONSUMER-LABEL-G` 单一拍照入口自动识别分流已完成第一版：条码 / 二维码 / 数字编码 / 配料表 / 营养成分表 / 未知图片统一进入识别信息卡和商品分析报告；后续继续补微信真机条码/二维码图片解码 Provider、正式 GTIN 数据源和数字标签页面结构化解析。

人工并行：后续 GB2760 新增/变更 staging 行复核签核；生产 DATABASE_URL、Aliyun OCR Key、AI Key、商店账号和法务材料均不阻塞当前本地 MVP。

---

## 7.5 跨端策略、产品蓝图与中长期目标

**这是一个面向普通消费者的产品**：一切规划以用户端"食品标签拍照解读 + 消费决策辅助"主路径体验为中心；内部数据控制台、GB2760 复核工作台等是支撑工具，不得喧宾夺主。

跨端策略：

```
正式用户端：user-uniapp，uni-app + Vue3，面向 H5/PWA、微信小程序、Android、iOS
旧前端：src/ 纯 JS + Vite，保留为历史原型和迁移来源
后台管理端：admin-web，Vue3 + TDesign Web，单独建设
后端 API：复用 backend/，Hono + Drizzle + PostgreSQL，所有端唯一入口
OCR：Python FastAPI + RapidOCR，本地服务只允许后端调用
统一的是：产品流程、设计 token、数据状态、API 契约、平台能力接口、文案规范
```

完整规范收敛在 [`docs/product-blueprint/`](./docs/product-blueprint/README.md)（产品 / 消费者决策 / 消费者体验 / 设计系统 / 视觉 / 前端 / 页面 / 跨端 / API / 数据可信 / UI 路线 / 后台 / 隐私 / 测试验收）。

- **短期目标（消费者主路径打磨）**：`user-uniapp/` 已完成标签类型识别、营养成分表结构化、我的关注项本地设置、食品标签解读报告、目标字段过滤和基础组件/token MVP；后续重点是真实后端 API、微信开发者工具/真机验收和 OCR 真实样本回归。
- **设计基线（已确认 2026-06-14）**：主色薄荷绿色阶（`--primary #059669`、主按钮 `#047857`、辅助高亮 `#10b981`、装饰 `#34d399`、浅底 `#ecfdf5`）+ 16px 圆角；规范已写入 `docs/product-blueprint/DESIGN_SYSTEM.md` / `VISUAL_STYLE_GUIDE.md`，并已落到 `user-uniapp/src/styles/tokens.css`；旧 `src/styles.css` 当前仍为青绿/8px，保留历史原型状态。
- **中期目标（数据 + 标签能力 + 跨端）**：包装正面卖点提示、两款商品对比、GB2760 增量人工复核扩大正式库覆盖、生产数据库与生产 OCR（Aliyun）接入、微信小程序 / Android / iOS 适配落地、独立后台第一版。
- **长期目标（增值与上架）**：单一拍照入口下自动识别商品条码、数字标签二维码和配料表 OCR、真实 AI 总结、登录云同步跨设备验收、订阅支付、应用商店上架与合规材料（阶段 11，后置）。
- **人工阻塞项**：生产 DATABASE_URL、生产 Aliyun OCR Key、AI API Key、Apple/Google/国内商店账号、支付订阅账号、隐私政策法律确认、软著/备案/商标、GB2760 后续增量复核、后台/产品页面设计统一推进边界。
后台分期：

- **MVP**：数据源管理、GB2760 导入状态、staging 数据复核、食品添加剂管理、食品分类管理、OCR 记录查看、用户反馈查看、基础系统配置、管理员登录预留。
- **Beta**：用户管理、用户详情、扫描记录、标签解读报告管理、公告、FAQ、首页运营位配置、操作日志。
- **产品化**：会员管理、订阅计划、订单/支付记录、退款/取消记录、App/小程序版本配置、消息通知、AI/OCR 成本统计、角色权限、审计日志。
- **上架/商业化**：Apple IAP、Google Play Billing、微信支付、国内安卓渠道、订阅权益、第三方 SDK 清单、隐私协议版本管理。

- **Codex 下一步**：继续包装卖点提示与内容页推进；`CONSUMER-LABEL-F` 已收口。

## 8. 7 天执行计划

> 每天一个可验证闭环。遇人工阻塞时记录并继续后续无需人工的任务。

**Day 1：架构与后台规划文档收口**
- 目标：同步 `ARCHITECTURE_SPEC.md`、后台规划、API 契约、任务清单、计划和 Agent 规则。
- 验收标准：正式用户端 `user-uniapp`、后台 `admin-web`、复用现有 `backend/`、旧 `src/` 原型迁移边界全部写清楚；计划目录和计划命令不写成已实现。
- 是否需要人工：否。

**Day 2：STACK-A 现有结构确认**
- 目标：盘点 `backend/`、`src/`、`ios/`、`android/`，形成迁移方案。
- 验收标准：不删除旧前端，不创建重复后端，不把计划工程写成已完成。
- 是否需要人工：否。

**Day 3：STACK-B / STACK-C 用户端与后端规范**
- 目标：规划 `user-uniapp` 工程结构和现有后端 API 分层规范化。
- 验收标准：所有端通过后端 API；前端不直连 OCR/AI/数据库；小程序/App 不假设浏览器全局对象。
- 是否需要人工：需要确认正式初始化时间点。

**Day 4：ADMIN-B 后台数据治理 MVP**
- 目标：已在 ADMIN-A 菜单 IA 收口后，细化数据治理 MVP 页面/API。
- 验收标准：MVP 后台只做数据治理、OCR 记录、反馈、基础配置和管理员登录预留。
- 是否需要人工：GB2760 promote 仍需人工复核。

**Day 5：ADMIN-C / ADMIN-D 用户反馈与内容运营**
- 目标：规划用户管理、扫描/报告记录、用户反馈、公告、Banner、FAQ、隐私协议版本管理。
- 验收标准：隐私和协议文案需要版本管理；用户隐私字段最小必要展示。
- 是否需要人工：内容和合规文案需人工确认。

**Day 6：ADMIN-E/F/G/H 产品化后台规划**
- 目标：会员订阅、订单支付、OCR/AI 成本、权限审计、系统配置与功能开关规划。
- 验收标准：支付/订阅/上架标记人工阻塞；不伪造支付成功。
- 是否需要人工：支付账号、商店账号、法务材料。

**Day 7：回到消费者主路径实现**
- 目标：架构边界确认后执行 `CONSUMER-LABEL-A` 标签类型识别，再做营养表解析和关注项。
- 验收标准：低置信、失败、手动输入或信息不足不跳过文本确认 / 补充；不在旧前端继续堆不适合迁移的复杂功能。
- 是否需要人工：需要确认是否立即创建 `user-uniapp`。

---

## 9. 阶段验收标准

每个 Codex Batch 结束前必须按改动范围验证：

- 纯文档修改：`git diff --check`。
- 前端样式/组件小改：`npm run lint` + 相关现有测试；必要时 `npm run test`。
- 触达构建入口、路由、PWA、跨端配置：加 `npm run build`。
- 涉及后端：`cd backend && npm run typecheck` + 相关测试；必要时 `npm test` / `npm run build`。
- 涉及 GB2760 数据准入：按任务要求运行 `npm run validate:gb2760` 或对应校验。

禁止为了省时间跳过必要验证；也不要每次无差别跑完整测试。纯文档修改需说明未运行 build/test 的原因。

---

## 10. 维护规则

每次 Codex 修改后必须同步更新本文件（进度、阶段、已完成、未完成、阻塞、下一步），以及 `CODEX_TASKS.md`、`AI_REVIEW.md`；影响命令更新 `COMMANDS.md`，影响数据口径更新 `DATA_SOURCES.md`。未同步视为任务未完成。

不允许伪造进度，不允许把未完成写成已完成，不允许把 seed 样本当完整数据集，不允许把 `pending_review` / `unverified` 当 `verified`。

---

## 11. 最近一次修改记录

| 日期 | 修改内容 | 修改人/Agent | 验证结果 |
|---|---|---|---|
| 2026-06-21 | 单一拍包装入口自动识别商品第一版：新增 `services/recognition` 分层，拍照后按条码/二维码、OCR、数字编码、配料表、营养表、未知图片自动分类；报告页新增统一识别信息卡；商品码/二维码先查本机历史，缺配料和营养时可经后端 `POST /api/products/lookup` 调用 DeepSeek 公开信息补全；AI 搜索结果单独标注，不伪装成包装 OCR；识别历史按商品码/二维码合并，方便先拍条码后补拍配料表复用 | Codex | `npm --prefix backend run typecheck` / `npm --prefix backend test -- tests/productLookup.test.ts tests/foodAnalyze.test.ts tests/nutrition.test.ts tests/ocr.test.ts` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run lint` / `npm run user:regression:ocr-report` |
| 2026-06-21 | OCR 成熟度与商品码门禁：食品包装非条码/二维码 OCR 500 样本达到 `stable_500`，`494/500` 通过、通过率 `98.8%`、`acceptancePass=true`，Codex 子 agent `92`、DeepSeek 报告级 `92`；条码 / 二维码 / 商品数字码解析级各 500 用例全部通过，`1500/1500`、准确率 `100%`；条码 / 二维码合成 PNG 图片级 `983/1000` 通过，条码图片 `500/500`、二维码图片 `483/500`、整体 `98.3%`，并链接商品数字码解析 `500/500`；Codex 子 agent 和 DeepSeek 图片级 Review 分别 `92` / `98`；边界：真实包装照片和微信真机扫码仍未证明，需真机/平台能力补充 | Codex | `OCR_LOCAL_URL=http://127.0.0.1:8000 OCR_EVAL_TARGET=500 OCR_EVAL_DISABLE_NETWORK_SAMPLES=1 OCR_EVAL_INCLUDE_CHATGPT_SUBAGENT=1 npm run ocr:evaluate` / `npm run ocr:sample-quality` / `npm run ocr:review-report` / `npm run product-code:evaluate` / `npm run product-code:review-report` / `npm run product-code:image-evaluate` / `npm run product-code:image-review-report` / `npm --prefix user-uniapp run typecheck` / `git diff --check` |
| 2026-06-20 | ChatGPT UI 评审入口与报告微优化：新增 `user-uniapp/scripts/chatgpt-ui-review.mjs` 和 `review:chatgpt` 命令，读取 visual smoke 截图并调用 OpenAI Responses API 输出结构化页面评审；当前机器无 `OPENAI_API_KEY`，脚本已明确返回 `missing_openai_api_key`，不伪造评审结果；基于当前 ChatGPT 会话内截图评审，将报告页营养重点图的重复“重点”标签改为“少量吃 / 控油量 / 控份量 / 少盐搭配”等行动提示 | Codex | `npm --prefix user-uniapp run lint` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run audit:product-output` / `npm --prefix user-uniapp run regression:ocr-report` / `node --check user-uniapp/scripts/chatgpt-ui-review.mjs` / `npm --prefix user-uniapp run build:h5` / `npm --prefix user-uniapp run visual:smoke`；`npm --prefix user-uniapp run review:chatgpt` 预期失败：`missing_openai_api_key` |
| 2026-06-20 | 成分镜决策优先报告与真实 AI/OCR 闭环收口：DeepSeek 默认模型更新为 `deepseek-v4-flash`，后端 AI 输出增加安全清洗和规则 fallback；Aliyun OCR provider 已实现 ACS3 签名调用与结果映射，Key/Secret 仅后端环境变量；OCR 结构化补齐商品名、食品类型、营养表、生产日期、包装声明和未确认线索；首页保持拍包装主入口，手动页按五类字段补充，报告页改为单一结论、关键原因优先级、营养重点图、折叠识别详情和小反馈入口；完成 DeepSeek smoke 与多轮 UI 评审，最终结论 `pass` 且 `topIssues=[]` | Codex | `npm --prefix backend run typecheck` / `npm --prefix backend test -- tests/aiFoodExplanation.test.ts tests/foodAnalyze.test.ts tests/ocr.test.ts` / `npm --prefix user-uniapp run lint` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run audit:product-output` / `npm --prefix user-uniapp run regression:ocr-report` / `npm --prefix user-uniapp run build:h5` / `npm --prefix user-uniapp run visual:smoke` / `npm --prefix user-uniapp run build:mp-weixin` / `git diff --check` |
| 2026-06-20 | 新增真实 AI 接通后的逐页 UI 评审提示词：登记首页、拍照识别、结果页、历史、我的、成分搜索的功能说明、审查问题、禁用表达和验收顺序；产品蓝图索引同步新增 `AI_UI_REVIEW_PROMPT.md` | Codex | `git diff --check` |
| 2026-06-20 | OCR 配置与识别页体验补强：后端优先读取 `OCR_LOCAL_URL` 并兼容旧 `OCR_SERVICE_URL`，RapidOCR 目标地址统一为 `http://127.0.0.1:18080/ocr`；确认页接入轻量识别质量提示，只在识别缺配料表、只有营养表、噪音较多等场景展示；同步更新微信小程序、部署和产品蓝图文档 | Codex | `npm.cmd --prefix backend test -- tests/config.test.ts tests/ocr.test.ts` / `npm.cmd --prefix backend run typecheck` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run regression:ocr-report` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run visual:smoke` / `git diff --check` |
| 2026-06-19 | user-uniapp 历史页复用强化：历史页新增关注项和最近筛选，关注项筛选按报告重点命中、过敏提示、较高营养项和重点添加剂判断；历史记录新增复制分享摘要动作 | Codex | `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run audit:product-output` |
| 2026-06-19 | user-uniapp OCR 结构化确认页：确认页改为配料表、营养数字、致敏原提示、包装声明四个确认卡片，每块显示状态并支持单独清空，降低用户处理混杂 OCR 文本的成本 | Codex | `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run regression:ocr-report` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run visual:smoke` / `git diff --check` |
| 2026-06-19 | user-uniapp 拍照质量提示闭环：拍照上传区新增拍摄小检查，确认页按识别结果展示本次识别提示，覆盖低置信、包装信息较多、营养表-only、包装声明-only 和缺少配料表等场景 | Codex | `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run regression:ocr-report` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run visual:smoke` / `git diff --check` |
| 2026-06-19 | 市面优秀食品扫描 / 营养 App 调研：新增竞品分析与成分镜优化清单，拆解 Yuka、Open Food Facts、CodeCheck、Fooducate、MyFitnessPal、Cronometer 等产品，沉淀 P0/P1/P2 优先级和不照搬项，并接入产品蓝图阅读顺序 | Codex | `git diff --check` / `rg` 静态扫描 / PowerShell 固定字符串扫描 |
| 2026-06-19 | user-uniapp 品牌与结果话术修正：统一品牌为“成分镜”，报告/分享/搜索/后端输出移除旧品牌、二次比对和旧首屏标题口径；报告改为“结果摘要 / 未确认线索 / 识别文字”，搜索字段改为“结果用途”，产品输出审查拦截旧口径 | Codex | `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run regression:ocr-report` / `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix backend run typecheck` / `npm.cmd --prefix backend test -- tests/nutrition.test.ts tests/reports.test.ts` / `git diff --check` |
| 2026-06-19 | user-uniapp 报告输出二次精简：报告页新增“营养数字”条形展示，营养和添加剂描述改成短句，前端/后端报告摘要、OCR 等待态和添加剂规则清理“结合目标 / 不单独下结论”等低价值表达；产品输出审查新增禁用词 | Codex | `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run regression:ocr-report` / `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `npm.cmd --prefix user-uniapp run visual:smoke` / `npm.cmd --prefix backend run typecheck` / `npm.cmd --prefix backend test -- tests/nutrition.test.ts tests/reports.test.ts` / `git diff --check` |
| 2026-06-19 | user-uniapp H5 视觉烟测门禁：新增 `visual:smoke` / `user:visual:smoke`，基于 `dist/build/h5` 临时静态服务，用 Playwright + 本机 Chrome/Edge 检查首页、拍食品标签、搜索、我的、报告、历史、设置的关键文案、非空渲染和横向溢出，并输出截图到系统临时目录 | Codex | `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `npm.cmd --prefix user-uniapp run visual:smoke` / `npm.cmd run user:visual:smoke` |
| 2026-06-19 | user-uniapp OCR 与报告信号二次收敛：报告决策、关注项、添加剂识别和过敏提醒不再直接扫描完整 OCR 识别文字；搜索卡片改为“数据来自 / 结果用途”；营养表-only 不展示添加剂大白话；未确认项不进入正常添加剂解释；过敏原“含有”声明必须同时命中过敏原关键词；产品输出审查增加函数级结构检查 | Codex | `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` |
| 2026-06-19 | user-uniapp OCR/报告样本回归：新增 `regression:ocr-report` / `user:regression:ocr-report`，用 Vite 直接加载 `labelTextExtractor` 与 `reportBuilder` 跑 6 个样本，确认产品名/规格/厂家/裸“含有”声明不进目标字段，营养表-only 不触发添加剂和过敏提醒，未确认添加剂不进入正常解释 | Codex | `npm.cmd --prefix user-uniapp run regression:ocr-report` |
| 2026-06-19 | user-uniapp 产品输出审查门禁：新增 `audit:product-output` / `user:audit:product-output`，检查搜索结果、报告描述、OCR 目标字段和添加剂大白话的必要字段与文案边界；同步清理添加剂提醒中的过度安抚表达 | Codex | `npm.cmd run user:audit:product-output` / `npm.cmd --prefix user-uniapp run audit:product-output` / `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `rg` 静态文案扫描 / `git diff --check` |
| 2026-06-19 | user-uniapp 搜索结果与后端报告口径收口：搜索卡片改为“为什么看 / 标签写法 / 数据来自 / 结果用途”等普通用户字段；报告页营养说明按糖、钠、脂肪、能量分别解释；后端 `nutrition/parse` 不再把单位标题当作有效营养数据，`reports/label` 清理“核验 / 阈值 / 标识偏差”等专业话术并补回归测试 | Codex | `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / `npm.cmd --prefix backend run typecheck` / `npm.cmd --prefix backend test -- tests/nutrition.test.ts tests/reports.test.ts` / `rg` 静态文案扫描 / `git diff --check` |
| 2026-06-19 | user-uniapp OCR 与报告大众化收口：营养字段提取要求字段名 + 数值 + 单位结构，包装正面只保留明确目标声明，非目标字段不进入报告；包装声明-only 结果只展示“信息不足 / 还需要补充 / 未确认线索”；待确认配料单独进入“未确认线索”；清理偏购买建议和专业结构表达；完成独立 AI 静态评审与 H5 样例验证 | Codex | `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run build:h5` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / Playwright H5 样例检查 / `rg` 静态文案扫描 |
| 2026-06-19 | user-uniapp 小程序产品化收口：拍照/OCR 后清晰可生成结果自动进入报告，低置信、失败、手动输入或信息不足时进入文本确认 / 补充；新增扫描记录页并接入我的关注页和报告页；报告页改为“食品标签解读”，首屏展示糖、钠、脂肪、能量、添加剂和过敏原重点提醒，补添加剂大白话、收藏、分享入口和识别文字折叠区；新增设置与说明页，覆盖图片/OCR、本机记录、使用边界和本机数据清空 | Codex | `npm.cmd --prefix user-uniapp run lint` / `npm.cmd --prefix user-uniapp run typecheck` / `npm.cmd --prefix user-uniapp run build:mp-weixin` / Playwright H5 截图检查首页、我的、历史、报告、设置 / `git diff --check` |
| 2026-06-18 | 食品成分菌种边界修正：GB 2760 表 C.3 酶制剂来源/供体微生物改为 `other/pending_review`，只保留 `enzyme_source` / `enzyme_donor` 关系证据，不计入 NHC 可用于食品菌种覆盖；当前 `food_microorganism=40`、`other=81`、`current source relations=4426`，剩余 pending_review 仍为 563 | Codex | `npm --prefix backend test -- tests/ingredientKnowledge.test.ts` / `npm --prefix backend run typecheck` / `npm run ingredient:validate` / `npm run ingredient:coverage` / `npm run validate:data` / `npm run lint` / `npm run test` / `git diff --check` |
| 2026-06-18 | 食品成分官方目录来源补齐与专用表正式化：补齐三新食品、党参等 9 种食药物质、地黄等 4 种食药物质、可用于食品/婴幼儿食品菌种名单的 NHC 官方公告页和附件 URL；`ingredient:promote-reviewed` 扩展到官方目录专用表，仅提升 S0、政府公开文档、本地文件+SHA 校验、非 OCR、证据完整数据；本地 DB 本轮提升 `ingredient_master=2146`，`novel_food_ingredient_rules=95`、`food_medicine_rules=13`、`microorganism_strains=26` 进入 current，剩余 `pending_review ingredient=563` | Codex | `npm run ingredient:inventory` / `npm run ingredient:extract` / `npm run ingredient:import` / `npm run ingredient:promote-reviewed` / `npm run ingredient:validate` / `npm run ingredient:coverage` / `git diff --check` / `npm run validate:data` / `npm --prefix backend run typecheck` / `npm run lint` / `npm run test` / `npm --prefix backend run test` / `npm run build` / `npm --prefix backend run build` |
| 2026-06-18 | 食品成分官方源缺口决策清单：`ingredient:report` 新增生成 `docs/decision-required.md`，把数字标签独立公告官方原文缺失、GB 28050-2025 糖醇能量规则原文未定位集中列为需要用户/人工处理事项；新增回归测试，确认缺口不会被静默跳过或误当 verified 数据；不新增、不删除、不提升任何成分数据 | Codex | `npm run ingredient:report` / `npm --prefix backend test -- tests/ingredientKnowledge.test.ts` / `npm --prefix backend run typecheck` / `npm run lint` / `npm run ingredient:validate -- --no-db` / `npm run ingredient:validate` / `git diff --check` |
| 2026-06-18 | 食品成分官方材料管线加固：`buildPipelineSnapshot` 将文本抽取失败和结构化解析失败分开记录为 `failed_extract` / `failed_parse`，`pdftotext` 缺失或损坏 PDF 失败时输出可执行原因；新增 PDF 抽取失败回归测试，确认单个来源失败不会中断其他官方材料 staging 抽取；不新增、不删除、不提升任何成分数据 | Codex | `npm --prefix backend test -- tests/ingredientKnowledge.test.ts` / `npm --prefix backend run typecheck` / `npm run lint` / `npm run ingredient:validate -- --no-db` / `npm run ingredient:validate` / `git diff --check` |
| 2026-06-18 | 记录后续单一拍照入口自动识别分流规划：后端自动判断商品条码、数字标签二维码、配料表 / 营养成分表；各分支独立取数后统一进入成分归一化、官方成分知识库匹配和成分分析；信息不足时只提示重新拍摄或手动补充，不自动跳转、不设计串行流程、不改现有 UI | Codex | `git diff --check` |
| 2026-06-17 | 小程序 P0 识别质量与隐私补强：`labelTextExtractor` 只接收标准 OCR 结构，补强配料/营养/致敏原锚点、繁体/英文/OCR 错字和噪音停止条件；`ingredientParser` 保护特殊添加剂名称；`nutritionParser` 新增 Salt/盐独立解析和 kJ/kcal 换算；`additiveRules` 补 CMC、单双甘油脂肪酸酯、5'-呈味核苷酸二钠等 alias；结果页低置信/仅营养表等信息不足状态不强行给结论；历史持久化移除图片路径/摘要并保留 20 条 LRU；设置页补 OCR 图片处理和本地存储隐私说明 | Codex | `cd user-uniapp && npm install` / `npm run lint` / `npm run typecheck` / `npm run build:mp-weixin` / `git diff --check` |
| 2026-06-17 | 继续按 H5 截图优化小程序 P0 信息层级：消费建议页将“添加剂识别”前移到一句话建议后，重点提醒压缩为最多 4 条紧凑提示；结果页结论摘要改为按当前关注目标生成，默认日常不再泛泛提儿童/过敏；拍食品标签页移除手动输入空白时的重复大空态，缩短营养成分/致敏原辅助输入框，并按状态隐藏无效按钮 | Codex | `node /tmp/compcheck-ui-smoke.mjs` / `npm --prefix user-uniapp run lint` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run build:mp-weixin` / `git diff --check` |
| 2026-06-17 | 对小程序 P0 页面做可用性自测与 UI 收口：ARM 环境安装 Debian Chromium / chromedriver，`user-uniapp` 新增 Playwright 开发依赖并复用系统 Chromium；H5 截图覆盖首页、拍食品标签、手动输入、轻确认、消费建议、更多信息、我的关注和扫描记录；根据截图修正默认日常目标结论过重的问题，未设置的常见过敏原只作为普通查看提示，显式过敏/忌口命中仍最高优先级；确认主流程未出现商品正面、条码、商品库、商品对比或日化入口 | Codex | `apt-get update` / `apt-get install -y chromium chromium-driver` / `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -D @playwright/test` / `npm --prefix user-uniapp run dev:h5 -- --host 127.0.0.1 --port 5176` / `node /tmp/compcheck-ui-smoke.mjs` / `npm --prefix user-uniapp run lint` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run build:mp-weixin` / `git diff --check` |
| 2026-06-17 | 为「成分镜」P0 补齐 OCR 噪音过滤：拍照区增加配料表/营养表透明引导框；新增 `labelTextExtractor`，从 OCR 识别文字中分离 `ingredientText`、`nutritionText`、`allergenText` 并过滤广告语、生产信息、厂家信息、净含量等噪音；capture 轻确认改为三段有效文本确认，低置信或未识别到配料表时引导重新拍摄或手动输入；规则引擎只分析有效标签文本 | Codex | `npm --prefix user-uniapp run lint` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run build:mp-weixin` / `git diff --check` |
| 2026-06-17 | 将「成分镜」P0 从“拍商品/条码/mock 商品库”收缩为最小可用闭环：拍配料表/营养成分表 → OCR → 轻确认/手动修正 → 本地规则识别添加剂、糖、钠、脂肪、蛋白质、热量和过敏原 → 10 秒可读消费建议；首页文案改为“拍配料表，看懂成分”，capture 移除商品库主链路，关注设置改成单选主目标 + 儿童模式 + 过敏多选，结果页弱化适合谁/怎么选等 P1 内容 | Codex | `npm --prefix user-uniapp run lint` / `npm --prefix user-uniapp run typecheck` / `npm --prefix user-uniapp run build:mp-weixin` / `git diff --check` |
| 2026-06-17 | 将「成分镜」P0 主流程收敛为扫描主控台：小程序注册页为首页、拍商品、消费建议、我的关注、扫描记录、设置 6 页；首页首屏改为“拍商品，马上看懂”和“拍一下 / 扫一下”；`capture` 先识别商品正面/条码并尝试本地 mock 商品库，命中则直接使用库内配料和营养生成结果，未命中再引导拍配料表/营养表；新增 `additiveRules` 食品添加剂识别字典、`analysisSource` 来源元数据、`additiveRecognition` / `nutritionSnapshot` 结构化输出；结果页展示折叠的本次分析依据，历史记录保存来源信息；商品对比降级为 P1 未注册文件，设置页隐藏后端地址配置 | Codex | `cd user-uniapp && npm run lint` / `npm run typecheck` / `npm run build:mp-weixin` / `git diff --check` |
| 2026-06-17 | 新增 `DESIGN_GUIDE.md`：确立微信小程序消费者端品牌暂定「成分镜」，定义清新蓝绿色/米白背景、轻卡片、圆角按钮、柔和标签、空/错/加载态、页面结构与文案红线；同步优化 `user-uniapp` 首页、拍照、OCR、文本确认、识别结果、数据来源、配料说明、关注成分、扫描记录和设置等页面 UI/文案 | Codex | `cd user-uniapp && npm run lint` / `npm run typecheck` / `npm run build:mp-weixin` / `git diff --check` |
| 2026-06-16 | Batch MP-WEIXIN-A 真机 WXSS 编译修复：移除 `user-uniapp` 全局样式中的 `*` 通配 reset 和 Web-only scrollbar 伪元素，改用小程序可接受的显式元素选择器，解决 `app.wxss unexpected token *` | Codex | `cd user-uniapp && npm run build:mp-weixin` / `npm run lint` / `git diff --check` |
| 2026-06-16 | Batch MP-WEIXIN-A 构建脚本修复：`user-uniapp/scripts/mp-weixin.mjs` 改为直接通过当前 Node 执行 uni JS 入口，避开 Windows `.cmd` shim / shell 路径问题；补充 Windows `系统找不到指定的路径` / `DEP0190` 排查文档 | Codex | `cd user-uniapp && npm run lint` / `npm run build:mp-weixin` / `git diff --check` |
| 2026-06-16 | 合并根目录 `README.md` / `readme.md`：保留完整产品与协作入口为标准 `README.md`，删除小写入口，并同步修正 Agent 规则、文档索引和产品蓝图引用；仅文档整理，不改业务代码 | Codex | `git diff --check` |
| 2026-06-15 | Batch PLATFORM-C：补齐本地存储适配接口（`storageService` 平台后备、`imageStoreService` 清理能力、`clearLocalUserData` 联动清理、`ingredientApiService`/`main.js` 改用适配层） | Codex | `npm run lint` / `npm run test` / `git diff --check` |
| 2026-06-15 | Batch PLATFORM-B：补齐旧原型扫描能力适配接口 (`capturePhoto` / `pickImage` / `compressImage`) 并统一入口调用；`src/main.js` 使用适配层抽象替代平台分支判断 | Codex | `npm run lint` / `git diff --check` |
| 2026-06-15 | Batch CONSUMER-LABEL-A 后端化：新增后端 `POST /api/labels/classify` 与扫描会话 `POST /api/labels/scan`；`labels.scan` 已支持 `labelScanSession`/`labelScanImage` 落库与去重；`user-uniapp` 标签 adapter 改为后端优先，本地规则降级 | Codex | `cd backend && npm run test -- labels.test.ts` / `cd backend && npm run typecheck` / `cd backend && npm run build` / `cd user-uniapp && npm run typecheck` / `cd user-uniapp && npm run lint` / `git diff --check` |
| 2026-06-15 | Batch CONSUMER-LABEL-B 后端化：新增 `POST /api/nutrition/parse` 与 nutritionService，补充 `user-uniapp` 营养页后端优先 adapter + 本地 fallback，`API_CONTRACT.md`/`CODEX_TASKS.md`/`AI_REVIEW.md` 同步 | Codex | `cd backend && npm run test -- nutrition.test.ts` / `cd backend && npm run typecheck` / `cd user-uniapp && npm run typecheck` / `git diff --check` |
| 2026-06-15 | Batch CONSUMER-LABEL-D 后端化：新增 `POST /api/reports/label` 与 reportService，补充 `user-uniapp` 匹配确认页后端优先 report 适配 + 本地 fallback，`API_CONTRACT.md`/`CODEX_TASKS.md` 同步 | Codex | `cd backend && npm run test -- reports.test.ts` / `cd backend && npm run typecheck` / `cd user-uniapp && npm run typecheck` / `cd user-uniapp && npm run lint` / `git diff --check` |
| 2026-06-16 | Batch CONSUMER-FS-B：报告页新增育儿守护开关与儿童关注成分分层提示（色素/防腐剂/甜味剂），仅前端显示层增强 | Codex | `cd user-uniapp && npm run lint` / `cd user-uniapp && npm run typecheck` / `git diff --check` |
| 2026-06-16 | Batch CONSUMER-FS-C：新增营养-配料双向核验（糖/钠高价值项）并在报告页展示提示级提示结果 | Codex | `cd user-uniapp && npm run lint` / `cd user-uniapp && npm run typecheck` / `git diff --check` |
| 2026-06-16 | Batch CONSUMER-FS-D：报告页配料项与添加剂项增加可追溯入口，支持跳转 `ingredientDetail`（有 ID 直接跳转，无 ID 提示） | Codex | `git diff --check`（未运行 lint/typecheck：建议后续按影响范围补跑） |
| 2026-06-16 | Batch CONSUMER-LABEL-F：完成两款商品 Compare Mode 并排对比（含偏向提示），并补齐首页/报告入口与页面结构登记 | Codex | `cd user-uniapp && npm run lint` / `cd user-uniapp && npm run typecheck` / `git diff --check` |
| 2026-06-16 | Batch 1-E：成分详情页 GB2760 官方证据展示（`user-uniapp` 详情页官方证据摘要、pending_review 边界、来源链接与一键复制） | Codex | `cd user-uniapp && npm run lint` / `cd user-uniapp && npm run typecheck` / `git diff --check` |
| 2026-06-15 | Batch ADMIN-F/G/H：补齐 OCR/AI Provider 监控、OCR 失败日志/指标、AI 调用日志/成本、降级策略、功能开关、平台/版本/分享/通知/SDK 配置、管理员/角色权限/操作日志/审计日志页面/API 计划；明确密钥不展示、AI Key 阻塞、配置变更审计、RBAC 后置和 `admin-web` 尚未创建 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-D：补齐内容运营后台页面/API 计划，明确公告、Banner、首页场景卡、FAQ、数据说明文案、隐私政策和用户协议版本管理的目标路由、计划接口、状态枚举、平台范围、发布审计和人工/法务确认边界；未创建后台工程，不新增后端接口 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-C：补齐用户与反馈管理页面/API 计划，明确用户列表/详情、设备登录、扫描记录、标签解读报告、产品档案、用户反馈和禁用/恢复的目标路由、计划接口、现有 `/api/user/*` 边界、公开反馈提交与后台反馈处理分离、隐私脱敏和审计要求；未创建后台工程，不新增后端接口 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-B：补齐数据治理后台 MVP 页面/API 计划，明确数据源、GB2760 导入、staging 复核、添加剂、食品分类、使用规则、普通配料、营养字段规则和包装卖点词库的第一版 API 复用、只读/写权限边界和后续缺口；未创建后台工程，不新增后端接口 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch ADMIN-A：补齐后台信息架构与菜单矩阵，明确 Dashboard、数据治理、食品标签业务、用户与会员、内容运营、OCR/AI Provider、系统配置、权限审计的阶段归属和 MVP 边界；未创建后台工程，不触达业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch STACK-D：补齐 `admin-web/` 独立后台工程边界、目标目录结构、TDesign 工作台路由分组、MVP 启动范围、后台 API 落地边界和优先级；未创建后台工程，不触达业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | Batch STACK-C：核对现有 `backend/src` Hono 后端结构，补齐 routes/services/db/provider 分层边界、计划接口状态和消费者主路径 labels/nutrition/reports 后端化顺序；不创建第二套后端、不空建目录 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | 架构与后台规划文档优化：新增 `ARCHITECTURE_SPEC.md`，统一正式用户端 `user-uniapp`、后台 `admin-web`、复用现有 `backend/`、OCR Provider 链路和旧 `src/` 迁移边界；补齐后台用户/会员/订阅/公告/系统配置/OCR-AI 成本/权限审计/API/任务阶段；仅文档，不改业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-15 | 新增 `user-uniapp/` 正式用户端（uni-app + Vue3），迁移食品标签拍照解读主流程页面、组件、设计 token、集中 API client、平台适配层和本地历史/关注项存储；保留旧 `src/` 原型不删除；同步命令与蓝图文档 | Codex | `cd user-uniapp && npm run lint` 通过；`npm run typecheck` 通过；`npm run build:h5` 通过；`npm run build:mp-weixin` 通过 |
| 2026-06-15 | 消费者食品标签解读文档优化：新增 `CONSUMER_DECISION_SPEC.md` / `CONSUMER_UX_SPEC.md`，将产品定位统一为“食品标签拍照解读 + 消费决策助手”，同步产品、页面、前端、API、数据可信、UI 路线、QA、任务清单、Agent 规则和入口 README；仅文档，不改业务代码 | Codex | `git diff --check` 通过（未运行 build/test：纯文档修改） |
| 2026-06-14 | 确认设计基线为薄荷绿主色 + 16px 圆角：更新 `DESIGN_SYSTEM.md` / `VISUAL_STYLE_GUIDE.md` / `FRONTEND_SPEC.md` / `product-blueprint/README.md` 为规范值（含用户给定 5 色阶与角色），并把 `CODEX_TASKS.md` Batch FRONTEND-A 细化为可执行落地任务。仅文档，未改业务代码（曾试改 `src/styles.css` 后按用户要求 `git checkout` 还原） | Claude (Opus 4.8) | `git diff --check`（纯文档；`src/styles.css` 已还原为青绿/8px 原状） |
| 2026-06-14 | 新增产品蓝图规范集 `docs/product-blueprint/`（PRODUCT/DESIGN_SYSTEM/VISUAL_STYLE/FRONTEND/PAGE_STRUCTURE/CROSS_PLATFORM/API_CONTRACT/DATA_TRUST/UI_ROADMAP/ADMIN_CONSOLE/PRIVACY/QA 共 12 份 + README 索引）；同步 `CODEX_TASKS.md`（阶段 12-14：UI-SPEC/PLATFORM/FRONTEND 批次）、`AGENTS.md`、`COMMANDS.md`、`README.md`、`docs/README.md`、`PROJECT_PLAN.md`。仅文档，不改业务代码 | Claude (Opus 4.8) | `git diff --check`（未运行 build/test：纯文档修改，不影响代码/依赖/构建/运行方式） |
| 2026-06-14 | 接入本机 RapidOCR：后端 `rapidocr` provider 调用 `/home/downloads/tools/complens-ocr` FastAPI 服务，新增 `OCR_SERVICE_URL` 配置与外部组件台账 `INTEGRATIONS.md`；生产后续切换 Aliyun OCR | Codex | `backend ocr.test.ts` / 后端 `typecheck` / 后端 `build` / `npm test` / `lint` / `build` / `validate:data` / provider 实连本机 OCR 通过 |
| 2026-06-14 | Batch 5-B / UX-C：新增统一 dataStatus 映射工具，统一结果可信表达文案、颜色变量和 Badge class；搜索、详情、分析、报告、导出、数据治理页改为引用同一映射；产品页面整体设计仍暂缓 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 8-C：全页 loading / empty / error 状态复核，补齐搜索初始空态拍照/粘贴入口、GB2760 复核页错误重试与空态出口、GB2760 参考表错误重试；后续 5-B/UX-C 可信表达需先确认是否纳入产品页面设计暂缓范围 | Codex | `npm test` / `npm run lint` / `npm run build` / `git diff --check` 通过 |
| 2026-06-14 | Batch 3-B：OCR Provider 抽象命名闭环，后端支持 `manual` / `mock` / `aliyun` / `paddleocr` / `rapidocr`，mock 明确标注且真实 provider 仍需后端 Key；内部控制台后续 UI 按用户要求暂缓到产品页面设计统一推进 | Codex | 针对性验证：`backend ocr.test.ts`、后端 `typecheck`、前端 OCR 协议断言 |
| 2026-06-14 | GB2760 复核闭环：自动创建缺失成分映射、人工批量签核 1447 条剩余 staging 行，并 promote 全部 2391 条 A.1 staging 到 `additive_usage_rules`；根目录新增 `map:gb2760` / `promote:gb2760` 委托命令 | Codex + 人工 | `validate:gb2760` 通过；报告：staging 2404、pending_review 0、promoted 2391、legacy_verified 13、additive_usage_rules 2391、verified_regulation_ingredients 308、import_errors 0 |
| 2026-06-14 | Batch 1-D：新增 `validate:gb2760` 数据准入校验服务和后端 CLI，根目录命令委托到 backend；CI 增加 Postgres、migrate、seed、validate 链路 | Codex | `npm run validate:gb2760` 通过；报告：staging 2404、pending_review 2391、legacy_verified 13、additive_usage_rules 0、import_errors 0 |
| 2026-06-14 | Batch 1-C：新增 `additive_usage_rules` 表、`promote:gb2760` 后端脚本和 promote 准入服务；只处理人工 `approved` / `promoted` 行，空签核场景 0 promoted，不把历史 `verified` staging 行自动写入新规则表 | Codex | `db:migrate` / `db:seed` / `promote:gb2760` / 后端 `typecheck` / 后端 `test` 通过；查询：additive_usage_rules 0、pending_review 2391、verified 13、import_errors 0 |
| 2026-06-14 | Batch 1-A：新增 `source_documents` / `import_runs` / `import_errors`，`db:seed` 写入 GB2760 三类导入批次，新增需登录的 `GET /api/gb2760/import-runs` 与错误明细接口 | Codex | `db:migrate` / `db:seed` / 后端 `typecheck` / 后端 `test` 通过；审计表查询：source 1、runs 3、errors 0 |
| 2026-06-14 | 文档与任务计划重构：`CODEX_TASKS.md` 重排为阶段 1-11，新增 GB2760 staging→promote→validate 流程、UX 阶段、人工阻塞跳过规则；`PROJECT_PLAN.md` 加入 7 天计划；补 `AGENTS.md` 并把产品入口合并到既有 `README.md`；更新 `COMMANDS.md` 计划命令、`DATA_SOURCES.md` 状态模型、`AI_REVIEW.md` | Claude (Opus 4.8) + Codex | `validate:data` / `lint` / `test` / `build` / `git diff --check` 通过 |
| 2026-06-14 | GB2760 参考表行边界修复，`validate:data` 通过，2800 行分表数量与官方 PDF 一致 | Codex | `validate:data` / `lint` / `test` / `build` 通过 |
