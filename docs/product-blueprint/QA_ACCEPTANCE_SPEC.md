# 测试与验收规范（QA_ACCEPTANCE_SPEC）

> 本文件属于 `docs/product-blueprint/` 蓝图集，是 CompLens / 成分镜（产品代号 CompCheck）的**测试与验收规范**，由测试验收负责人维护。仅作验收依据，不替代数据治理流程，不新增数据库不存在的状态。
>
> 关联文档：
> - `docs/product-blueprint/PAGE_STRUCTURE.md`：页面清单、主流程与逐页验收标准的来源。
> - `docs/product-blueprint/CONSUMER_DECISION_SPEC.md`：消费者食品标签解读与消费决策验收来源。
> - `docs/product-blueprint/CONSUMER_UX_SPEC.md`：消费者体验和话术验收来源。
> - `docs/product-blueprint/DATA_TRUST_SPEC.md`：数据可信展示规范，可信状态枚举的展示口径。
> - `docs/product-blueprint/CROSS_PLATFORM_SPEC.md`：跨端平台能力与验收边界。
> - `docs/product-blueprint/ARCHITECTURE_SPEC.md`：正式技术栈、旧前端迁移、后端唯一入口、OCR 服务链路和后台分期。
> - 根目录 `COMMANDS.md`：本仓库**真实可用命令**的权威清单，本文档第 6 章命令矩阵以其为准。
> - 根目录 `readme.md` 与 `docs/README.md`：项目入口与文档分类索引。
> - 数据状态枚举代码权威来源：`src/utils/dataStatus.js`。
>
> 验收原则：所有勾选项以"可观测、可复现"为准；无法确认的标注"待确认"；计划未实现的标注"待办 / 后置"，不得当作已通过。

---

## 0. 验收范围与约定

- 适用范围：食品标签（配料表、营养成分表、包装正面卖点），不含化妆品、护肤品、药品（化妆品 `#/cosmetics/*` 为原型保留，非本期主路径）。
- 主路径（不可偏离）：首页 → 拍食品标签 → 标签类型识别 → OCR → 文本确认 → 配料拆分 / 营养字段解析 → 我的关注项 → 食品标签解读报告 → 保存历史。承载页面见 `PAGE_STRUCTURE.md`。
- 技术栈验收边界：正式用户端为计划 `user-uniapp`（uni-app + Vue3）；当前 `src/` Vite 前端是历史原型和迁移来源；后台为计划 `admin-web`（Vue3 + TDesign Web）；后端复用现有 `backend/`。计划目录和命令不得当成已实现。
- 三态约定：loading / empty / error 三态已在各页复核（Batch 8-C 完成），验收时三态均须可观测。
- 移动端通用约束：尊重安全区（顶部刘海 / 底部 Home 条）；禁止整页横向滚动；可点击控件命中区域 ≥ 44px；底部主导航在小屏使用 `MOBILE_NAV_ITEMS`（首页 / 扫描 / 搜索 / 历史 / 设置）。
- 可信枚举（仅以下 7 个，文案以 `dataStatusLabel()` 为准）：`verified_regulation`（官方标准已验证）/ `verified_jecfa`（安全评价已匹配，非中国法规范围）/ `pending_review`（待复核来源数据）/ `mapped_candidate`（疑似匹配，待确认）/ `common_ingredient`（普通配料）/ `unverified`（未验证）/ `unknown_from_ocr`（暂未收录）。
- 文案红线：可以买、不能买、健康、不健康、安全、有害、致癌、治疗、诊断、一定过敏，以及旧红线绝对安全、绝对有害、一定致敏、一定不能吃、一定有效、有毒、治疗疾病、医学诊断。

---

## 1. 用户主流程验收

> 每步给出可勾选验收标准，统一覆盖：功能正确、三态、可信展示、移动端。逐页路由与对应文件以 `PAGE_STRUCTURE.md` 为准。

### 1.1 首页（homePage / `#/`）

- [ ] 首屏主 CTA「拍照解读食品标签」一眼可见，可进入扫描。
- [ ] 首页场景卡片包含控糖看配料、低钠看营养、给孩子买零食、过敏/忌口检查、少添加选择、对比两款食品。
- [ ] loading：首屏有骨架 / 占位，不白屏。
- [ ] empty：无历史时显示引导首拍态，而非空白。
- [ ] error：本地数据读取失败时给出重试入口。
- [ ] 可信：历史卡片若显示可信徽标，均来自 `dataStatus` 枚举（经 `dataStatusLabel()`）；首页不对任何成分作权威断言。
- [ ] 移动端：主 CTA ≥ 44px；首屏无横向滚动；尊重底部安全区。

### 1.2 拍照 / 上传 + OCR 识别（scanPage / `#/scan`）

- [ ] 拍照与相册上传两条入口均可用（Web 环境降级到文件输入，Capacitor 环境走原生相机）。
- [ ] 页面提示三类拍摄目标：配料表、营养成分表、包装正面。
- [ ] loading：OCR 识别中有进度态。
- [ ] empty：未选择图片时有引导态。
- [ ] error：相机权限被拒 / OCR 失败时，给出"重试"与"改为手动输入"两条出路，不崩溃。
- [ ] 可信：OCR 输出以"待确认文本"措辞呈现，严禁在此页把识别结果当作权威结论。
- [ ] OCR 结果必须进入文本确认页，不得跳过（见 §2）。
- [ ] 移动端：按钮 ≥ 44px；进度态无整页横向滚动；尊重安全区。

### 1.3 标签类型识别 / 选择

- [ ] 支持 `ingredient_list`、`nutrition_facts`、`front_claims`、`barcode_or_product`、`unknown_label` 类型。
- [ ] 低置信或未知标签时允许用户选择“这是配料表 / 这是营养成分表 / 这是包装正面 / 都不是，重新拍”。
- [ ] 标签类型判断不展示为权威结论。
- [ ] 选择后进入对应文本确认或重新拍。

### 1.4 文本确认（ocrConfirmPage / `#/ocr-confirm`）

- [ ] 文本区可编辑并保存修正，确认后进入分析（拆分）。
- [ ] 文本确认支持配料表、营养成分表和包装正面文案。
- [ ] loading：载入待确认文本时有占位。
- [ ] empty：无可确认文本（直达此页）时不报错，引导回扫描。
- [ ] error：提交确认失败可重试。
- [ ] 可信：此页文本仍为用户 / OCR 文本，未经数据库匹配，不展示任何可信结论；明确提示"确认后再分析"。
- [ ] 移动端：编辑区适配软键盘不被遮挡；输入框字号 ≥ 16px 防 iOS 缩放；按钮 ≥ 44px；不横向滚动。
- [ ] 全页无文案红线词。

### 1.5 配料拆分 + 匹配确认（analyzePage / `#/analyze`）

- [ ] 确认后文本自动拆分为单条配料，逐条匹配并展示来源与可信徽标。
- [ ] loading：拆分与匹配进行中有状态态。
- [ ] empty：无可拆分配料时引导回确认 / 扫描。
- [ ] error：匹配服务失败时可重试，且不丢失已确认文本。
- [ ] 可信：每条按 `dataStatus` 打标；`mapped_candidate` 标"疑似匹配，待确认"并提供确认 / 否定；`pending_review` / `unverified` / `unknown_from_ocr` 不得呈现为权威结论；`verified_jecfa` 须注明"非中国法规范围"。
- [ ] 低置信匹配（约 0.55–0.79，`matchConfidence`）以"待确认区块"呈现，不直接当作已确认结论（`matchConfidence` 是运行时数值，非独立 `dataStatus`）。
- [ ] 移动端：长配料列表纵向滚动，禁止横向滚动；徽标与文案在小屏不截断；按钮 ≥ 44px。

### 1.6 营养成分表解析

- [ ] 可解析或手动确认 `energy`、`protein`、`fat`、`saturatedFat`、`transFat`、`carbohydrate`、`sugar`、`sodium`、`dietaryFiber`、`servingSize`、`perUnit`、`nrvPercent`。
- [ ] 控糖关注项优先展示糖、碳水和甜味来源。
- [ ] 低钠关注项优先展示钠和含钠配料。
- [ ] 信息不足时显示“信息不足，建议结合包装原文确认”。
- [ ] 不输出医疗或营养诊断。

### 1.7 我的关注项

- [ ] 不登录也能本地保存控糖、低钠、减脂、高蛋白、少添加、给孩子看、过敏/忌口。
- [ ] 可添加和删除忌口成分。
- [ ] 报告页按关注项排序。
- [ ] 关注项文案不构成诊断。

### 1.8 食品标签解读报告（reportDetailPage / `#/reports/:id`，兼容 `#/report/:id`）

- [ ] 报告名称为“食品标签解读”，不叫法规分析报告 / 风险分析报告 / 添加剂合规报告。
- [ ] 报告含一句话结论、我的关注项、购买前建议关注、配料表解读、营养成分解读、包装卖点核对、食品添加剂分组、过敏/忌口提示、暂未识别/暂未收录、数据来源和查看依据。
- [ ] 普通人内容默认展示，专业依据默认折叠。
- [ ] 报告可保存到历史 / 档案、分享。
- [ ] loading：报告加载中有占位。
- [ ] empty：报告不存在 / 已删除时优雅降级并回列表。
- [ ] error：加载失败可重试。
- [ ] 可信：逐项沿用 `dataStatus` 枚举；整体结论为中性、可核查表述；非中国法规口径项（`verified_jecfa`）明确标注。
- [ ] 移动端：长报告纵向滚动；徽标 / 表格不横向溢出；操作按钮 ≥ 44px。
- [ ] 全文无文案红线词（可由 `npm run lint` 对静态文案兜底）。

### 1.9 保存历史 / 档案（historyPage / `#/history`、productArchivePage / `#/products`）

- [ ] 报告保存后可在历史 / 产品档案中检索回看（历史支持 `?q=` 与 `?filter=`，过滤值经 `normalizeHistoryFilter`）。
- [ ] loading：列表加载占位。
- [ ] empty：无历史 / 无档案时引导首拍。
- [ ] error：读取失败可重试。
- [ ] 可信：历史 / 档案卡片若显示可信徽标，与报告保持一致，均来自 `dataStatus` 枚举。
- [ ] 移动端：列表纵向滚动；筛选控件 ≥ 44px；不横向滚动。

### 1.10 主路径连续性（端到端）

- [ ] 从首页可一路走到保存历史，无死路。
- [ ] OCR → 文本确认环节不可被跳过。
- [ ] 任一中间步骤失败时，已确认文本 / 已采集数据不丢失，可回退重试。
- [ ] 拍一张也能分析；拍两张可合并；拍三张报告更完整但不强制。
- [ ] 包装卖点核对和两款商品对比若未实现，必须标为后续，不阻塞 MVP。

---

## 2. 数据可信验收

> 依据 `DATA_TRUST_SPEC.md`。验收核心：展示层忠实呈现可信状态，不把待定 / 未验证 / OCR / AI 内容包装成权威结论。

- [ ] `verified_regulation` 显示"官方标准已验证"，并附 `sourceName` / `sourceVersion` / `regulatoryBasis` 等可信字段，可作官方规则展示。
- [ ] `verified_jecfa` 显示"安全评价已匹配（非中国法规范围）"，且明确标注"非中国法规范围 / 仅 JECFA 安全评价"，不得呈现为 GB 2760 使用范围或中国法规结论。
- [ ] `pending_review` 显示"待复核来源数据"，未被展示成官方 / 已验证结论。
- [ ] `mapped_candidate` 显示"疑似匹配，待确认"，不作权威结论。
- [ ] `common_ingredient` 显示"普通配料"，不被展示为"已通过 GB 2760 法规核验"。
- [ ] `unverified` 显示"未验证"，不作权威结论。
- [ ] `unknown_from_ocr` 显示"暂未收录"，识别但未匹配的内容被保留、不静默丢弃，并提示已进入人工校验队列。
- [ ] OCR 结果未跳过文本确认页（用户输入来源，必须用户确认）。
- [ ] AI 内容仅作解释 / 摘要 / 风险边界提示，未编造成分数据、GB2760 结论、ADI、限量、条款编号、安全结论或来源链接，未替代 OCR / 数据库匹配，未给出医疗诊断。
- [ ] 来源标注使用真实 `sourceScope` / `sourceName`，不伪造来源链接。
- [ ] 营养成分表和包装正面卖点来自 OCR/用户确认文本，按标签信息展示，不包装成官方数据库结论。
- [ ] 消费者报告中的专业来源和法规证据可展开，但默认不抢占第一屏。
- [ ] 遇未知 / 非法状态按 `normalizeDataStatus` 归一为 `unverified` 保守展示，未自创新枚举标签。
- [ ] GB2760 相关展示不把样本 seed 当完整数据库，不把"按生产需要适量使用"改写为数值（`validate:gb2760` 强制，见 §6）。

---

## 3. 移动端 UI 验收

> 以 iPhone Safari 为主要验收机型，Android Chrome 与 Capacitor WebView 同步抽查。真机 / Lighthouse PWA 为人工验收。

- [ ] 安全区：页面高度使用 `100dvh`（避免 iOS Safari 地址栏导致的 `100vh` 抖动 / 溢出）。
- [ ] 安全区：顶部 / 底部使用 `env(safe-area-inset-*)`，刘海与 Home 条不遮挡内容。
- [ ] 底部主导航不被 Home Bar 遮挡，命中区完整。
- [ ] 可点击控件命中区域 ≥ 44px（按钮、导航项、筛选控件）。
- [ ] 输入框字号 ≥ 16px，避免 iOS 聚焦时自动放大。
- [ ] 正文字号在小屏可读，徽标 / 文案不被截断。
- [ ] 无整页横向滚动（必要的表格可局部横滑并加视觉提示，如数据说明页 GB 表）。
- [ ] loading / empty / error 三态在移动端均可观测且不破版。
- [ ] `viewport-fit=cover` 与安全区样式存在（`npm run test` 含 viewport-fit 与安全区样式断言，可作静态兜底）。

---

## 4. 跨端验收

> 平台能力清单以 [`CROSS_PLATFORM_SPEC.md`](./CROSS_PLATFORM_SPEC.md) 为准；下表按当前已落地能力如实标注，未做平台标"待办 / 待确认"。

| 能力 / 检查项 | Web / PWA | Android（Capacitor 7.x） | iOS（Capacitor 7.x） | 微信小程序 | 后台管理 |
| --- | --- | --- | --- | --- | --- |
| 主路径走通（首页→保存历史） | 必查 | 必查 | 必查 | 待办 | 不适用 |
| 拍照 / 相册采集 | 文件输入降级 | `@capacitor/camera` 原生 | `@capacitor/camera` 原生 | 待办 | 不适用 |
| 分享 | Web Share / 复制降级 | `@capacitor/share` 原生 | `@capacitor/share` 原生 | 待办 | 不适用 |
| OCR 主路径与降级 | 必查 | 必查 | 必查 | 待办 | 不适用 |
| 三态（loading/empty/error） | 必查 | 必查 | 必查 | 待办 | 部分（仅 GB2760 复核） |
| 安全区 / 44px / 16px 输入 | 必查 | 必查 | 必查（主机型） | 待办 | 待确认 |
| PWA 安装 / Service Worker | 必查（人工 + Lighthouse） | 不适用 | 不适用 | 待办 | 待确认 |
| 平台工程同步（`cap:sync`） | 不适用 | 必查 | 必查 | 待办 | 不适用 |
| GB2760 内部复核工作台 | 仅内部账号 | 待确认 | 待确认 | 待办 | 部分落地（Batch 1-F，`blocked_by_user` 暂缓） |

补充说明：
- Web / PWA 为主交付形态；PWA 安装与 Lighthouse 验收为人工。
- Capacitor 锁定 7.x，匹配 `Node.js >= 20.19`，不得升级到要求 Node 22+ 的主版本。`ios/` 与 `android/` 为本机生成目录（已 gitignore），验收前需 `npm run build && npx cap add ios|android && npm run cap:sync`。`npx cap doctor` 允许提示本机未装 Xcode / Android Studio。
- 微信小程序：全部待办。
- 后台管理：仅内部 `gb2760ReviewPage` 部分落地，其余后台页为计划（见 `PAGE_STRUCTURE.md` §三、`ADMIN_CONSOLE_SPEC.md`）。

### 4.1 架构与安全验收

- [ ] 用户端、小程序、App、后台均通过后端 API 访问数据，不直连 PostgreSQL。
- [ ] 前端、小程序、App 不直连本机 OCR 服务、第三方 OCR、AI Provider 或 GB2760 导入脚本。
- [ ] OCR Key / AI Key 只出现在后端环境变量或后端部署配置中，未出现在前端 bundle、localStorage、公开配置或文档示例的客户端位置。
- [ ] OCR 服务不暴露公网；目标链路为用户端 / 小程序 / App → 后端 API → OCR Provider → Python FastAPI OCR Service → RapidOCR。
- [ ] OCR 失败必须降级到手动输入，OCR 成功也必须进入文本确认页。
- [ ] 当前 `src/` 旧前端没有继续新增复杂跨端业务；正式新业务若启动，优先按 `user-uniapp` 规划。
- [ ] 未创建 `admin-web` 前，不把后台菜单写成已落地；已创建后按 `ADMIN_CONSOLE_SPEC.md` 分期验收。
- [ ] 支付、订阅、上架、IAP、微信支付等在缺少账号和法务材料时标记 `blocked_by_user` 或 `[人工+Codex]`，未伪造成功状态。

### 4.2 后台分期验收

- [ ] MVP 后台只要求数据源管理、GB2760 导入状态、staging 数据复核、食品添加剂管理、食品分类管理、OCR 记录查看、用户反馈查看、基础系统配置、管理员登录预留。
- [ ] Beta 后台再验收用户管理、用户详情、扫描记录、标签解读报告管理、公告、FAQ、首页运营位、操作日志。
- [ ] 产品化后台再验收会员、订阅、订单/支付记录、退款/取消、版本配置、消息通知、AI/OCR 成本统计、角色权限、审计日志。
- [ ] 上架/商业化后台再验收 Apple IAP、Google Play Billing、微信支付、国内安卓渠道、订阅权益、第三方 SDK 清单、隐私协议版本管理。
- [ ] 后台操作日志包含管理员 ID、操作类型、对象类型、对象 ID、操作前、操作后、IP、User-Agent、操作时间。

---

## 5. 回归测试清单

> 每次涉及主路径 / 数据 / 文案改动的 Batch 结束前应逐项核对（可结合 §6 命令与人工验证）。

- [ ] OCR 失败降级手动输入：无 OCR Key / 服务不可用时不崩溃，保留 manual 路径，不伪造识别文本（`real → manual → fallback`）。
- [ ] 图片过大（约 8MB）：上传 / 预处理不崩溃，给出合理提示；大 blob 存 IndexedDB（`compcheck-images` / `scan-images`），不把图片 base64 写入 localStorage。
- [ ] 配料拆分异常：脏文本 / 复配括号 / 剂量后缀 / 前缀等异常输入下不崩溃，能给出可用拆分或空态。
- [ ] 低置信匹配（约 0.55–0.79）：以"待确认区块"呈现，不直接当作已确认结论。
- [ ] 未收录成分：标记 `unknown_from_ocr`（暂未收录），保留并进入人工校验队列，不编造结论。
- [ ] 报告保存：保存后可在历史 / 档案检索到。
- [ ] 历史打开：历史项可重新打开为报告 / 档案。
- [ ] 网络错误：API / OCR / 匹配网络失败时走 error 态并可重试；前端食品搜索 / 详情在后端不可用时降级到本地 seed 并展示未验证状态与错误提示。
- [ ] 数据源状态展示：七个 `dataStatus` 文案与展示约定正确（见 §2）。
- [ ] 禁止文案被 lint 拦截：`npm run lint` 命中红线组合词（可以买 / 不能买 / 健康 / 不健康 / 安全 / 有害 / 致癌 / 治疗 / 诊断 / 一定过敏 / 绝对安全 / 绝对有害 / 一定致敏 / 一定不能吃 / 有毒）时报错退出。
- [ ] 本机数据导出 / 导入 / 清空：往返一致，异常输入有兜底。
- [ ] 搜索历史开关：关闭后不记录搜索历史。

---

## 6. 验收命令矩阵

> 命令以根目录 `COMMANDS.md` 为权威。下表均为仓库真实命令，未实现命令不列入。

| 命令 | 作用 | 适用场景 | 必须通过条件 |
| --- | --- | --- | --- |
| `npm run lint` | JS 语法 + `public/` service worker 语法 + `src/` 文案合规扫描（`scripts/lint.mjs`） | 任何前端代码 / 文案改动 | 无语法错误、无红线文案，退出码 0 |
| `npm run test` | Node 原生 `assert` 测试（`scripts/test.mjs`，非 Jest/Vitest） | 任何前端逻辑 / 数据改动 | 全部断言通过，退出码 0 |
| `npm run build` | `vite build`，产物输出 `dist/` | 任何可能影响构建的改动 | 构建成功，退出码 0 |
| `npm run validate:data` | 食品数据必填字段 / 枚举 / 重复 id / 重复中文名+英文名 / 来源字段 / 可信等级 / 已验证来源依据 / 医疗化文案校验 + 数据质量与 GB2760 覆盖报告（`scripts/validate-data.mjs`） | 食品数据 / 可信字段改动 | 校验通过并输出报告，退出码 0 |
| `npm run validate:gb2760` | GB2760 正式库准入规则与禁止事项校验（封装 `backend`，读后端 DB） | 涉及 GB2760 数据 / 准入 / promote | 违规即报错退出；通过则退出码 0 |
| `git diff --check` | 纯文档 / 小改动基础检查（无尾随空格等） | 仅改 Markdown 文档、不影响代码 / 依赖 / 构建 | 无格式问题，退出码 0 |
| 后端三连：`cd backend && npm run typecheck && npm test && npm run build` | TS 类型检查 + Vitest + `tsc` 构建 | 涉及后端改动 | 三步均退出码 0 |

门禁约定（每个 Codex Batch 结束前必须通过）：

- 基线（所有 Batch）：`npm run validate:data && npm run lint && npm run test && npm run build`。
- 涉及后端：追加后端三连 `cd backend && npm run typecheck && npm test && npm run build`。
- 涉及 GB2760：追加 `npm run validate:gb2760`。
- 纯文档改动：至少 `git diff --check`；通常无需 build/test，但应说明未运行原因。

辅助 / 人工验收（非门禁）：`npm run dev` + `curl -I http://127.0.0.1:5173/` 预期 `200`；后端 `/health` 检查；真机与 Lighthouse PWA 为人工。

---

## 7. 当前测试覆盖现状与缺口

### 7.1 已覆盖（`scripts/test.mjs`，Node 原生 assert）

依据 `COMMANDS.md`「测试」章节，当前已覆盖范围包括（节选）：

- 成分中文 / 英文 / 别名 / 拼音 / 首字母 / 常见误写搜索；E-number / INS 编码搜索。
- 成分表文本拆分与匹配；真实包装前缀、复配括号、剂量后缀解析与分析置信度。
- OCR 拍照入口、确认页、manual / fallback 降级与响应格式校验；AI / OCR 未配置时的降级返回。
- 图片预处理与 IndexedDB 图片存储 fallback。
- 数据库批量成分匹配、低置信 / 未匹配保留；未知成分输出；重点关注项输出。
- 过敏原枚举、食品数据校验与本地存储异常兜底；本机数据导出 / 导入 / 清空。
- 搜索历史开关、首次引导默认偏好、会员 / 支持 / 隐私条款 / 对比等路由与 fallback。
- Capacitor Camera / Share 非 native 环境降级不崩溃；iOS 权限描述、viewport-fit 与安全区样式断言。
- 本地报告历史检索、来源引用与审核状态导出。

后端测试为 Vitest（`backend` 的 `npm test`），覆盖后端逻辑（具体用例清单**待确认**，以 `backend/` 测试文件为准）。

### 7.2 缺口（标注现状）

- 无独立前端单测框架（不使用 Jest / Vitest 前端），前端验证依赖 `scripts/test.mjs` 的 Node 原生 assert——**现状，非缺陷**，但组件级 / 渲染级断言覆盖有限。
- 无 E2E：Playwright 为计划 Batch 11-E，**后置**，当前主路径端到端走查为人工。
- 真机验收（iPhone Safari 安全区 / 触控 / 键盘）与 Lighthouse PWA 验收为**人工**，无自动化。
- 跨端：微信小程序**待办**；Android / iOS 真机能力为人工抽查。
- 后台管理：除内部 `gb2760ReviewPage` 部分落地外为计划，验收**待确认**。
- 生产数据库未完成，当前仅本地 / 开发环境对接，相关验收不得描述为生产已完成。

---

*本规范随 `PAGE_STRUCTURE.md`、`DATA_TRUST_SPEC.md`、`src/utils/dataStatus.js`、`COMMANDS.md` 与测试脚本演进；覆盖范围与规模数字为快照，以仓库实时为准。*
