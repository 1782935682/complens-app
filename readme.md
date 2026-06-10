# 成分 App 项目开发 README / Agent 指令文档

## 1. 项目目标

本项目是一个「成分 App」，目标是完成一个可持续迭代的应用项目，而不是只写一次性 Demo。

编码模型需要基于本 README 理解项目目标、分析现有代码、补齐缺失功能、修复问题，并在每次修改后给出明确的验证方式。

核心目标：

1. 完成项目基础功能闭环。
2. 保证代码结构清晰、可维护、可继续迭代。
3. 每次修改必须可运行、可验证。
4. 不允许只生成片段代码，必须尽量完成可直接落地的完整改动。
5. 不允许破坏已有功能、已有接口、已有目录结构，除非有充分理由并说明。

---

## 2. 编码 Agent 工作方式

每次接到任务后，必须按以下顺序执行：

### 2.1 先理解项目

修改代码前必须先阅读：

* 项目目录结构
* README / AGENTS / package 配置文件
* 入口文件
* 路由文件
* 状态管理文件
* API 请求封装
* 数据模型 / 类型定义
* 已有页面和组件
* 测试脚本或构建脚本

不要在不了解项目结构的情况下直接新增大量文件。

### 2.2 先给实现计划

动手改代码前，先输出简短计划：

```text
本次任务目标：
涉及文件：
实现步骤：
风险点：
验证方式：
```

计划要具体，不要写空话。

### 2.3 小步修改

每次只围绕当前任务修改相关文件。

禁止：

* 大范围无关重构
* 改动无关业务逻辑
* 删除已有功能
* 随意替换技术栈
* 随意引入大型依赖
* 为了通过构建而屏蔽错误
* 用 mock 数据假装功能完成

### 2.4 修改后必须验证

每次修改完成后必须给出：

```bash
# 安装依赖
...

# 本地启动
...

# 构建检查
...

# 测试命令
...
```

如果当前项目没有测试，也要至少执行：

* 类型检查
* lint 检查
* 构建检查
* 启动检查

如果某条命令无法执行，必须说明原因。

---

## 3. 项目定位

本项目（CompCheck / 成分小查）面向普通用户，用于查询、识别、理解食品和化妆品成分。

### 3.1 类别优先级

| 类别 | 优先级 | 说明 |
|---|---|---|
| 食品添加剂 | **主线，优先实现** | 用户扫描食品包装，查询添加剂安全性 |
| 食品天然原料 | 第二阶段 | 天然成分说明 |
| 营养成分 | 第三阶段 | 营养素查询 |
| 化妆品成分 | 并行，后续迭代 | 护肤品成分安全性 |

不同类别共用同一个 App，通过路由类别前缀区分（见第 26 节），数据和标准独立管理。

### 3.2 核心能力

1. 拍照 / 上传食品包装图片，OCR 识别后解析成结构化成分清单。
2. 搜索成分名称（中文名 / E-number / GB 编号 / 英文名），展示安全状态、使用限量、ADI 值。
3. **过敏原档案**：用户录入个人过敏原，任何搜索 / 详情 / 分析结果都自动高亮警告。
4. 特殊人群提示：孕妇、婴幼儿、糖尿病患者的禁忌成分标注。
5. 成分收藏 / 历史记录本地持久化。
6. 后续支持 AI 辅助分析。

不要把项目做成纯技术 Demo。页面、交互、数据流都要围绕真实用户使用场景设计。

---

## 4. 功能模块规划

### 4.1 首页

首页需要承担快速入口作用。

建议包含：

* 搜索框
* 拍照 / 上传图片入口
* 热门成分入口
* 最近查询记录
* 常见分类入口
* 简短说明文案

要求：

* 首屏清晰
* 不堆砌信息
* 移动端优先
* 交互路径短

### 4.2 成分搜索

搜索功能需要支持：

* 按中文名搜索
* 按英文名搜索
* 按别名搜索
* 模糊搜索
* 无结果提示
* 搜索历史记录

搜索结果建议展示：

* 成分名称
* 英文名
* 简短说明
* 风险等级 / 关注等级
* 所属分类

### 4.3 成分详情

成分详情页建议包含：

* 成分名称
* 英文名
* 别名
* 功能分类
* 常见用途
* 风险说明
* 适用人群提示
* 敏感肌提示
* 孕妇 / 儿童等特殊场景提示
* 参考说明
* 收藏按钮

文案要求：

* 不夸大
* 不制造焦虑
* 不给医疗诊断
* 不把风险说成绝对结论
* 不用“百分百安全”“绝对有害”等绝对表述

### 4.4 产品成分表识别

支持用户上传图片或输入成分表文本。

基础流程：

1. 用户上传图片或粘贴文本
2. 系统提取成分
3. 匹配本地成分库
4. 生成结果列表
5. 展示重点关注成分
6. 给出整体说明

如果 OCR 暂未接入，可以先实现文本输入版，但代码结构要预留图片识别接口。

### 4.5 收藏与历史记录

需要支持：

* 收藏成分
* 取消收藏
* 查询历史
* 清空历史
* 本地持久化

如果暂时没有后端，优先使用本地存储实现。

### 4.6 数据管理

成分数据应独立管理，不要散落在页面代码里。

建议结构：

```text
src/data/ingredients.ts
src/types/ingredient.ts
src/services/ingredientService.ts
```

如果项目不是 TypeScript，可按当前技术栈调整，但必须保持数据层、服务层、页面层分离。

---

## 5. 推荐数据模型

本项目使用纯 JavaScript（无 TypeScript），类型定义使用 JSDoc 注释，统一维护在 `src/types/`。

### 5.1 FoodAdditive（食品添加剂，主线）

```js
/**
 * @typedef {'low' | 'medium' | 'high' | 'unknown'} RiskLevel
 * @typedef {'permitted' | 'restricted' | 'prohibited' | 'unknown'} GbStatus
 *
 * @typedef {Object} FoodAdditive
 * @property {string} id                   - 唯一标识，kebab-case，如 "sodium-benzoate"
 * @property {'food-additive'} dataCategory
 * @property {string} nameCn               - 中文名，如 "苯甲酸钠"
 * @property {string=} nameEn              - 英文名，如 "Sodium Benzoate"
 * @property {string[]=} aliases           - 别名列表
 * @property {string=} eNumber             - EU E编号，如 "E211"
 * @property {string=} gbCode              - GB/INS 编号，如 "INS 211"
 * @property {string} category             - 功能类别：防腐剂 / 甜味剂 / 色素 / 增稠剂 / 抗氧化剂 等
 * @property {string[]=} functions         - 具体功能描述列表
 * @property {string} description          - 用户友好的说明文案
 * @property {RiskLevel} riskLevel
 * @property {string=} riskSummary         - 风险简要说明
 * @property {GbStatus} gbStatus           - GB 2760 状态
 * @property {string=} adi                 - 每日允许摄入量，如 "0–5 mg/kg bw"（无限制填 "不限"）
 * @property {string=} usageLimits         - 使用限量说明，如 "碳酸饮料中最大用量 0.2 g/kg"
 * @property {string[]=} foodCategories    - 允许使用的食品类别，如 ["碳酸饮料", "果汁"]
 * @property {string[]=} allergenTypes     - 过敏原标注，引用 ALLERGEN_TYPES 中的 id
 * @property {string[]=} cautionFor        - 特殊人群：'pregnant' | 'infant' | 'diabetic' | 'renal'
 * @property {string=} sourceNote          - 数据来源，如 "GB 2760-2014 表 A.1 第 XX 条"
 */
```

数据文件路径：`src/data/food-additives.js`

### 5.2 CosmeticIngredient（化妆品成分，后续迭代）

```js
/**
 * @typedef {Object} CosmeticIngredient
 * @property {string} id
 * @property {'cosmetic-ingredient'} dataCategory
 * @property {string} nameCn
 * @property {string=} nameEn
 * @property {string=} inciName            - INCI 标准名称
 * @property {string[]=} aliases
 * @property {string=} category
 * @property {string[]=} functions
 * @property {string} description
 * @property {RiskLevel} riskLevel
 * @property {string=} riskSummary
 * @property {string[]=} allergenTypes     - 过敏原标注（如香料、MI 等）
 * @property {string[]=} suitableFor
 * @property {string[]=} cautionFor
 * @property {string=} sourceNote
 */
```

数据文件路径：`src/data/cosmetic-ingredients.js`

### 5.3 Allergen（过敏原枚举）

```js
/**
 * @typedef {Object} AllergenType
 * @property {string} id       - 标识符，如 "peanut"
 * @property {string} nameCn   - 中文名，如 "花生"
 * @property {string} nameEn   - 英文名，如 "Peanuts"
 */
```

标准 14 类过敏原定义在 `src/data/allergens.js`，id 枚举固定为：
`peanut` / `milk` / `egg` / `wheat` / `soy` / `nuts` / `fish` / `shellfish` / `sesame` / `mustard` / `celery` / `lupin` / `molluscs` / `sulphites`

### 5.4 SearchResult

```js
/**
 * @typedef {Object} SearchResult
 * @property {string} id
 * @property {'food-additive' | 'cosmetic-ingredient'} dataCategory
 * @property {string} nameCn
 * @property {string=} nameEn
 * @property {string} description
 * @property {RiskLevel} riskLevel
 * @property {string=} category
 * @property {string[]=} allergenTypes     - 用于搜索结果中过敏原角标
 */
```

### 5.5 AnalysisResult

```js
/**
 * @typedef {Object} AnalysisResult
 * @property {Array<FoodAdditive|CosmeticIngredient>} ingredients - 已匹配成分
 * @property {number} matchedCount
 * @property {string[]} unknownItems       - 未能匹配的成分名
 * @property {Array<FoodAdditive|CosmeticIngredient>} highlights  - 重点关注
 * @property {Array<FoodAdditive|CosmeticIngredient>} allergenItems - 含用户过敏原的成分
 * @property {string} summary
 */
```

---

## 6. 代码结构要求

优先保持当前项目已有结构。

如果是前端项目，建议结构如下：

```text
src/
  assets/
  components/
  pages/
  router/
  services/
  store/
  data/
  types/
  utils/
  hooks/
```

如果是后端项目，建议结构如下：

```text
src/
  controller/
  service/
  repository/
  model/
  dto/
  config/
  util/
```

如果是全栈项目，建议结构如下：

```text
client/
server/
shared/
docs/
```

要求：

1. 页面组件不要直接写复杂业务逻辑。
2. API 请求统一封装。
3. 类型定义统一维护。
4. 工具函数必须可复用。
5. 重复逻辑必须抽取。
6. 不要写无法维护的超大文件。

---

## 7. UI / 交互要求

整体风格：

* 简洁
* 干净
* 信息明确
* 移动端友好
* 不要过度花哨

页面必须考虑：

* loading 状态
* 空状态
* 错误状态
* 网络失败
* 无搜索结果
* 长文本展示
* 小屏幕适配

按钮、输入框、卡片、列表等组件尽量复用。

---

## 8. 安全与合规边界

本项目不提供医疗诊断。

成分风险说明必须使用谨慎表达，例如：

```text
可能需要关注
一般认为刺激性较低
部分敏感人群可能不适
建议结合自身情况判断
```

禁止使用：

```text
绝对安全
绝对有害
一定致敏
一定有效
治疗疾病
医学诊断
```

涉及健康、孕妇、儿童、过敏等内容时，必须避免绝对化结论。

---

## 9. AI 功能预留

后续可以接入 AI 分析，但当前代码设计要预留接口。

建议预留：

```text
src/services/aiAnalysisService.ts
```

接口示例：

```ts
export async function analyzeIngredientsByAI(input: string) {
  // 后续接入真实 AI 服务
}
```

注意：

1. API Key 不能写死在前端代码。
2. 密钥必须通过环境变量读取。
3. 前端不能直接暴露服务端密钥。
4. 暂未接入真实 AI 时，不要伪造真实分析结果。

---

## 10. 环境变量要求

如果项目需要环境变量，必须提供 `.env.example`。

示例：

```env
VITE_API_BASE_URL=
VITE_APP_NAME=成分 App
```

如果是后端：

```env
SERVER_PORT=8080
DATABASE_URL=
OPENAI_API_KEY=
```

禁止提交真实密钥。

---

## 11. 错误处理要求

所有异步请求必须处理异常。

基础要求：

```ts
try {
  // request
} catch (error) {
  // show user friendly message
}
```

不要直接把原始异常展示给用户。

前端展示：

```text
请求失败，请稍后重试
识别失败，请换一张更清晰的图片
暂未找到相关成分
```

开发日志可以保留，但生产环境不要输出敏感信息。

---

## 12. 本地运行要求

编码模型需要根据项目实际技术栈补充以下命令。

### 安装依赖

```bash
npm install
```

或：

```bash
pnpm install
```

### 本地启动

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 测试

```bash
npm run test
```

如果项目没有某个脚本，需要补齐，或者说明当前无法执行的原因。

---

## 13. 每次迭代输出格式

每次完成任务后，必须按以下格式回复：

```text
完成内容：
1.
2.
3.

修改文件：
- path/to/file

验证结果：
- 已执行：xxx
- 结果：通过 / 失败
- 失败原因：xxx

后续建议：
1.
2.
```

不要只说“已完成”。

---

## 14. 任务拆分建议

如果项目还未完成，按以下顺序迭代：

### 第一阶段：基础可运行

1. 修复项目启动问题
2. 补齐依赖
3. 统一目录结构
4. 完成首页
5. 完成基础路由

验收标准：

* 项目可以启动
* 首页可以访问
* 构建不报错

### 第二阶段：成分数据闭环

1. 定义成分数据模型
2. 增加本地成分数据
3. 实现搜索
4. 实现详情页
5. 实现空状态和错误状态

验收标准：

* 可以搜索成分
* 可以进入详情
* 无结果时有提示

### 第三阶段：成分表分析

1. 支持文本输入成分表
2. 拆分成分文本
3. 匹配成分库
4. 输出分析结果
5. 展示重点关注成分

验收标准：

* 输入一段成分表后可以得到结构化结果
* 已知成分能匹配
* 未知成分能单独列出

### 第四阶段：收藏和历史

1. 实现收藏
2. 实现取消收藏
3. 实现查询历史
4. 实现本地持久化

验收标准：

* 刷新页面后收藏不丢失
* 查询历史可查看
* 可以清空历史

### 第五阶段：体验优化

1. 优化移动端样式
2. 优化 loading
3. 优化错误提示
4. 优化长文本展示
5. 优化组件复用

验收标准：

* 手机端布局正常
* 交互清晰
* 不出现明显样式错乱

### 第六阶段：AI / OCR 扩展

1. 预留 OCR 接口
2. 预留 AI 分析接口
3. 增加服务端代理
4. 增加环境变量配置
5. 增加失败降级策略

验收标准：

* 不暴露密钥
* 接口结构清晰
* 未配置 AI 时项目仍可运行

---

## 15. 禁止事项

编码模型必须遵守：

1. 不要删除用户已有代码，除非明确说明原因。
2. 不要无关重构。
3. 不要写死 API Key。
4. 不要提交真实密钥。
5. 不要伪造接口返回。
6. 不要跳过错误处理。
7. 不要只写伪代码。
8. 不要只改一半。
9. 不要生成无法运行的代码。
10. 不要引入不必要的大型依赖。
11. 不要修改无关文件。
12. 不要用 mock 数据冒充真实功能完成。
13. 不要为了构建通过删除核心逻辑。
14. 不要在没有验证的情况下说已完成。
15. 不允许自动 push 到 `main` 分支，所有提交必须通过 PR 或 MR 流程合并。

---

## 16. 代码质量要求

代码必须满足：

1. 命名清晰。
2. 文件职责单一。
3. 函数不要过长。
4. 复杂逻辑要有必要注释。
5. 公共逻辑要抽取。
6. 类型定义要准确。
7. 异常路径要处理。
8. 用户提示要友好。
9. 样式要统一。
10. 构建不能报错。

---

## 17. 提交信息规范

每次提交建议使用：

```text
feat: 新增功能
fix: 修复问题
refactor: 重构代码
style: 样式调整
docs: 文档修改
test: 测试相关
chore: 工程配置
```

示例：

```text
feat: add ingredient search page
fix: handle empty ingredient search result
docs: update agent development guide
```

---

## 18. 给编码模型的最终执行指令

你是本项目的编码 Agent。

你的目标不是回答概念，而是完成代码。

请严格执行：

1. 先阅读项目结构。
2. 再判断当前项目完成度。
3. 找出缺失功能和阻塞问题。
4. 给出本轮实现计划。
5. 修改代码。
6. 运行验证命令。
7. 输出修改文件、验证结果和下一步建议。

每轮只做必要改动，但必须保证当前改动可运行、可验证、可继续迭代。

如果发现 README 与现有代码冲突，以现有代码为准，并说明冲突点和处理方式。

## 19. 项目命令文档维护要求

项目中必须单独维护一个命令说明文档，建议命名为 `COMMANDS.md`，用于集中记录所有与项目相关的常用命令，包括但不限于依赖安装、项目启动、构建、测试、代码检查、打包、部署、环境变量说明等。

每次编码 Agent 修改项目代码、配置文件、依赖、启动方式、构建方式或测试方式时，必须同步检查并更新 `COMMANDS.md`，确保该文档中的命令始终与当前项目实际情况一致。

如果本次修改影响了项目运行方式，但未更新 `COMMANDS.md`，则视为本次任务未完成。

## 20. 页面审美与整体体验要求

项目中的所有页面、组件、弹窗、表单、按钮、列表、卡片、图标、颜色、间距、字体、空状态、加载状态、错误状态等，必须符合现代 App 审美，不能只满足功能可用。

编码 Agent 在实现任何页面或交互时，必须同时关注视觉效果和用户体验，要求：

1. 页面整体要简洁、干净、统一，不允许出现明显粗糙、廉价、拼凑感。
2. 配色要克制、协调，不能使用过多高饱和颜色。
3. 字体大小、行高、间距、圆角、阴影、边框必须统一。
4. 组件风格必须一致，不能每个页面各写一套视觉样式。
5. 移动端页面必须优先适配，不能出现挤压、溢出、错位、按钮过小等问题。
6. 搜索、识别、详情、收藏、历史等核心页面必须有清晰的信息层级。
7. loading、空状态、错误状态、无结果状态不能直接空白或丑陋展示，必须有友好的视觉提示。
8. 所有涉及用户操作的地方，要有明确反馈，例如点击、提交、收藏、取消、上传、识别失败等。
9. 不允许为了快速完成功能而忽略页面质量。
10. 每次新增或修改页面、组件、样式时，必须同步检查整体 UI 是否一致。

如果本次改动涉及页面、组件或交互，但最终效果明显不符合基础审美和移动端体验，则视为本次任务未完成。
## 21. 技术栈规范与约束

本项目使用以下技术栈，编码 Agent 不得在未经说明的情况下更换或引入新技术。

### 21.1 已确定技术栈

| 技术 | 选型 | 说明 |
|---|---|---|
| 语言 | 纯 JavaScript (ES2022+) | **不使用 TypeScript**，用 JSDoc 注释类型 |
| 模块系统 | ES Modules (`type: "module"`) | `import` / `export`，不用 CommonJS |
| 框架 | 无框架 | **不使用 React / Vue / Svelte** 等 |
| 打包工具 | 无打包工具 | **不使用 Vite / webpack / rollup** |
| 构建脚本 | `scripts/build.mjs` | 当前为文件复制，后续可扩展 |
| 开发服务器 | `scripts/dev-server.mjs` | 自定义 Node.js HTTP 服务 |
| 路由 | 自实现 hash 路由 | `window.location.hash` + `hashchange` |
| 样式 | 单文件 `src/styles.css` | 原生 CSS，不使用 CSS-in-JS 或预处理器 |
| 状态 | 无状态管理库 | 模块级函数 + localStorage |
| 测试 | `scripts/test.mjs` | Node.js 原生 `assert`，不使用 Jest / Vitest |
| Lint | `scripts/lint.mjs` | 自定义语法检查，不使用 ESLint |

### 21.2 禁止引入的依赖

以下依赖禁止引入，除非有充分理由并单独说明：

- 任何 UI 框架（React、Vue、Angular、Svelte 等）
- 任何打包工具（Vite、webpack、Parcel、esbuild 等）
- TypeScript 编译器
- 任何 CSS 框架（Tailwind、Bootstrap 等）
- 任何状态管理库（Redux、Zustand、Pinia 等）
- 任何路由库
- 任何测试框架（Jest、Vitest、Mocha 等）
- jQuery 或任何 DOM 操作库

### 21.3 允许引入的依赖

- 服务端代理（后端实现时）：如 `express`、`fastify`
- OCR/AI SDK（服务端）：如供应商官方 SDK
- 数据库 ORM（服务端）：如 `better-sqlite3`、`pg`

---

## 22. AI_REVIEW 文件大小与归档规则

`AI_REVIEW.md` 只用于记录当前这一轮代码修改的审查材料，不作为长期流水账使用。

每次编码 Agent 完成新一轮修改后，必须直接覆盖更新 `AI_REVIEW.md`，确保其中只包含本次改动相关内容，包括任务目标、修改摘要、修改文件、验证命令、验证结果、风险点和本次 `git diff` 摘要。

禁止将每一轮修改内容持续追加到同一个 `AI_REVIEW.md` 中，避免文件无限变大、影响其他 AI 审查效率。

历史审查记录默认由 Git 提交历史负责保存。

如果某次改动比较重要，需要长期保留审查记录，可以将当次 `AI_REVIEW.md` 复制归档到：

```text
docs/reviews/
```

建议命名格式：

```text
docs/reviews/YYYY-MM-DD-task-name.md
```

例如：

```text
docs/reviews/2026-06-10-home-page.md
docs/reviews/2026-06-10-ingredient-search.md
```

归档不是每次都必须做，只有重要阶段、重大功能、重大重构或版本发布前才需要归档。

每次修改完成后的规则是：

1. 覆盖更新 `AI_REVIEW.md`。
2. 同步检查 `COMMANDS.md` 是否需要更新。
3. 如果本次改动重要，再额外归档到 `docs/reviews/`。
4. 不要让 `AI_REVIEW.md` 长期累积历史内容。

## 23. 项目进度与目标计划维护要求

项目中必须单独维护一个 `PROJECT_PLAN.md`，用于记录当前项目目标、实现进度、阶段计划、已完成内容、待完成内容和下一步任务。

`PROJECT_PLAN.md` 用来让编码 Agent 和其他 AI 快速判断项目当前状态，避免每次重新理解项目、重复实现、遗漏功能或偏离目标。

`PROJECT_PLAN.md` 必须包含以下内容：

1. 项目最终目标
2. 当前实现进度
3. 当前阶段目标
4. 已完成功能
5. 未完成功能
6. 当前阻塞问题
7. 下一步计划
8. 阶段验收标准
9. 最近一次修改记录

建议格式如下：

```md
# Project Plan

## 1. 项目最终目标

本项目目标是完成一个可正式使用、可持续迭代的成分查询与分析 App。

核心能力包括：

- 成分搜索
- 成分详情
- 成分表识别
- 成分风险提示
- 收藏与历史
- 移动端友好页面
- 后续 AI 分析能力扩展

## 2. 当前阶段

当前阶段：第一阶段 / 基础可运行

## 3. 当前进度

整体进度：0%

| 模块 | 状态 | 进度 | 说明 |
|---|---|---:|---|
| 项目启动 | 未开始 | 0% | 待确认项目是否可运行 |
| 首页 | 未开始 | 0% | 待实现 |
| 成分搜索 | 未开始 | 0% | 待实现 |
| 成分详情 | 未开始 | 0% | 待实现 |
| 成分表分析 | 未开始 | 0% | 待实现 |
| 收藏历史 | 未开始 | 0% | 待实现 |
| UI 审美优化 | 未开始 | 0% | 待实现 |
| 命令文档 | 未开始 | 0% | 待维护 |
| AI 审查文档 | 未开始 | 0% | 待维护 |

## 4. 已完成功能

暂无。

## 5. 未完成功能

- 项目基础启动
- 首页
- 搜索页
- 详情页
- 成分表文本分析
- 收藏功能
- 历史记录
- 移动端适配
- UI 统一优化
- AI / OCR 接口预留

## 6. 当前阻塞问题

暂无。编码 Agent 需要先检查项目实际代码后更新。

## 7. 下一步计划

### 第一阶段：基础可运行

目标：

- 项目可以正常安装依赖
- 项目可以正常启动
- 项目可以正常构建
- 首页可以访问
- 基础目录结构清晰

任务：

1. 检查项目结构。
2. 修复启动问题。
3. 补齐基础依赖。
4. 建立基础页面和路由。
5. 创建或更新 `COMMANDS.md`。
6. 创建或更新 `AI_REVIEW.md`。

验收标准：

- `npm install` 成功
- `npm run dev` 成功
- `npm run build` 成功
- 首页可访问
- 无明显控制台错误

### 第二阶段：成分数据闭环

目标：

- 支持成分搜索
- 支持成分详情
- 支持本地成分数据维护

任务：

1. 定义成分数据模型。
2. 建立本地成分数据。
3. 实现搜索逻辑。
4. 实现搜索结果页。
5. 实现成分详情页。

验收标准：

- 可以搜索成分
- 可以进入详情页
- 无结果时有友好提示

### 第三阶段：成分表分析

目标：

- 支持用户输入成分表文本
- 自动拆分和匹配成分
- 输出分析结果

任务：

1. 实现文本输入。
2. 实现成分拆分。
3. 实现本地成分匹配。
4. 实现未知成分展示。
5. 实现重点关注成分展示。

验收标准：

- 输入成分表后可以得到结构化结果
- 已知成分能匹配
- 未知成分能单独列出

### 第四阶段：收藏与历史

目标：

- 支持收藏成分
- 支持查询历史
- 支持本地持久化

任务：

1. 实现收藏。
2. 实现取消收藏。
3. 实现查询历史。
4. 实现清空历史。
5. 刷新后数据不丢失。

验收标准：

- 收藏功能正常
- 历史记录正常
- 本地存储正常

### 第五阶段：体验和审美优化

目标：

- 页面达到正式 App 基础审美
- 移动端体验正常
- 交互状态完整

任务：

1. 统一颜色、字体、圆角、间距。
2. 优化首页视觉。
3. 优化搜索结果样式。
4. 优化详情页信息层级。
5. 补齐 loading、空状态、错误状态。
6. 检查移动端布局。

验收标准：

- 页面无明显粗糙感
- 移动端无错位、溢出、挤压
- 核心操作有明确反馈

### 第六阶段：AI / OCR 扩展预留

目标：

- 为后续 AI 分析和 OCR 识别预留结构

任务：

1. 预留 OCR service。
2. 预留 AI analysis service。
3. 预留后端代理方案。
4. 补充环境变量说明。
5. 未配置 AI 时项目仍可运行。

验收标准：

- 不暴露 API Key
- 不影响基础功能
- 结构可扩展

## 8. 最近一次修改记录

| 日期 | 修改内容 | 修改人/Agent | 验证结果 |
|---|---|---|---|
| 待更新 | 待更新 | 待更新 | 待更新 |

## 9. 维护规则

每次编码 Agent 修改项目后，必须同步检查并更新 `PROJECT_PLAN.md`。

如果本次修改影响了项目目标、阶段进度、已完成功能、未完成功能、下一步计划或验收状态，必须同步更新 `PROJECT_PLAN.md`。

如果本次修改完成了某个功能模块，必须更新对应模块状态和进度。

如果没有同步更新 `PROJECT_PLAN.md`，则视为本次任务未完成。
```

---

## 24. 多类别路由规范

本项目支持多个成分类别，路由必须包含类别前缀。

### 24.1 路由结构

```text
#/                          首页（类别选择 + 快速入口）
#/food                      食品模块首页（热门添加剂、分类入口）
#/food/search?q=...         食品成分搜索
#/food/ingredient/:id       食品成分详情
#/food/analyze              食品成分表分析
#/cosmetics                 化妆品模块首页
#/cosmetics/search?q=...    化妆品搜索
#/cosmetics/ingredient/:id  化妆品成分详情
#/cosmetics/analyze         化妆品成分表分析
#/favorites                 收藏夹（跨类别）
#/settings                  用户设置（过敏原档案）
```

### 24.2 路由解析规则

`resolveRoute(hash)` 函数必须返回包含 `category` 字段的路由对象：

```js
// 示例返回值
{ view: 'search', category: 'food', query: '苯甲酸钠' }
{ view: 'detail', category: 'food', id: 'sodium-benzoate' }
{ view: 'analyze', category: 'cosmetics', input: '' }
{ view: 'settings' }
{ view: 'favorites' }
{ view: 'home' }
```

### 24.3 数据加载规则

- `category === 'food'` 时，从 `src/data/food-additives.js` 加载数据
- `category === 'cosmetics'` 时，从 `src/data/cosmetic-ingredients.js` 加载数据
- service 层函数必须接受 `category` 参数，根据类别分发数据源

---

## 25. 食品添加剂数据文件规范

### 25.1 文件路径

```text
src/data/food-additives.js    - 食品添加剂数据
src/data/allergens.js         - 标准过敏原枚举
src/data/cosmetic-ingredients.js  - 化妆品成分数据（将现有 ingredients.js 重命名）
```

### 25.2 food-additives.js 格式

```js
import { ALLERGEN_TYPES } from './allergens.js';

/** @type {import('../types/ingredient.js').FoodAdditive[]} */
export const foodAdditives = [
  {
    id: 'sodium-benzoate',
    dataCategory: 'food-additive',
    nameCn: '苯甲酸钠',
    nameEn: 'Sodium Benzoate',
    aliases: ['安息香酸钠'],
    eNumber: 'E211',
    gbCode: 'INS 211',
    category: '防腐剂',
    functions: ['防止食品变质', '抑制细菌和霉菌生长'],
    description: '常用于碳酸饮料、果汁、酱油等食品中的防腐剂，在酸性环境下效果更好。',
    riskLevel: 'medium',
    riskSummary: '与维生素 C（抗坏血酸）共存时可能生成微量苯，建议关注复配情况。',
    gbStatus: 'permitted',
    adi: '0–5 mg/kg bw',
    usageLimits: '碳酸饮料中最大用量 0.2 g/kg',
    foodCategories: ['碳酸饮料', '果汁饮料', '酱油', '醋'],
    allergenTypes: [],
    cautionFor: [],
    sourceNote: 'GB 2760-2014 表 A.1'
  }
];

export const popularFoodAdditiveIds = ['sodium-benzoate'];
```

### 25.3 allergens.js 格式

```js
/** @type {Array<{id: string, nameCn: string, nameEn: string}>} */
export const ALLERGEN_TYPES = [
  { id: 'peanut',    nameCn: '花生',       nameEn: 'Peanuts' },
  { id: 'milk',      nameCn: '牛奶/乳制品', nameEn: 'Milk' },
  { id: 'egg',       nameCn: '鸡蛋',       nameEn: 'Eggs' },
  { id: 'wheat',     nameCn: '小麦/麸质',   nameEn: 'Wheat/Gluten' },
  { id: 'soy',       nameCn: '大豆',       nameEn: 'Soybeans' },
  { id: 'nuts',      nameCn: '坚果',       nameEn: 'Tree nuts' },
  { id: 'fish',      nameCn: '鱼类',       nameEn: 'Fish' },
  { id: 'shellfish', nameCn: '贝类/甲壳类', nameEn: 'Crustacean shellfish' },
  { id: 'sesame',    nameCn: '芝麻',       nameEn: 'Sesame' },
  { id: 'mustard',   nameCn: '芥末',       nameEn: 'Mustard' },
  { id: 'celery',    nameCn: '芹菜',       nameEn: 'Celery' },
  { id: 'lupin',     nameCn: '羽扇豆',     nameEn: 'Lupin' },
  { id: 'molluscs',  nameCn: '软体动物',   nameEn: 'Molluscs' },
  { id: 'sulphites', nameCn: '亚硫酸盐',   nameEn: 'Sulphur dioxide/Sulphites' },
];

export const ALLERGEN_IDS = ALLERGEN_TYPES.map((a) => a.id);
```

### 25.4 数据必填字段

以下字段所有食品添加剂数据条目都必须填写，不允许省略：

`id` / `dataCategory` / `nameCn` / `category` / `description` / `riskLevel` / `gbStatus` / `sourceNote`

以下字段有数据时必须填写，无数据时填空数组或空字符串，不允许省略键名：

`aliases` / `allergenTypes` / `cautionFor` / `foodCategories`

---

## 26. 过敏原系统规范

### 26.1 用户数据存储

过敏原偏好存储在 `localStorage`，key 为 `compcheck:allergens`，值为过敏原 id 字符串数组：

```js
// 示例
['peanut', 'milk', 'wheat']
```

在 `src/store/userStore.js` 中实现以下接口：

```js
export function getUserAllergens()       // 返回 string[]
export function setUserAllergens(ids)    // 保存 string[]
```

### 26.2 过敏原警告触发规则

满足以下任一条件时，必须显示过敏原警告：

1. 成分的 `allergenTypes` 数组与用户设置的过敏原 id 有交集
2. 成分描述或别名中包含用户过敏原的中文名（兜底匹配）

不满足上述条件，或用户未设置过敏原，则不显示警告。

### 26.3 各页面警告展示方式

| 页面 | 展示方式 |
|---|---|
| 搜索结果列表 | 成分卡片右上角显示红色「含过敏原」角标 |
| 成分详情页 | 页面顶部显示醒目红色 banner："⚠ 此成分含您关注的过敏原：花生、牛奶" |
| 成分表分析结果 | 单独置顶一个「含过敏原成分」分区，红色高亮 |
| 收藏页 | 含过敏原的收藏条目显示红色角标 |

### 26.4 用户设置页

路由 `#/settings`，必须包含：

1. 过敏原选择列表（基于 `ALLERGEN_TYPES`，可多选，复选框样式）
2. 保存按钮，保存后立即生效
3. 清空所有过敏原设置按钮
4. 已设置提示文案（"已关注 3 类过敏原"）

---

## 27. 现有代码迁移规则

当前项目代码是化妆品原型。在向食品添加剂主线迁移过程中，编码 Agent 必须遵守以下规则。

### 27.1 可以修改

- `src/router/router.js`：扩展支持多类别路由
- `src/services/ingredientService.js`：重构为按类别分发数据源
- `src/store/userStore.js`：新增过敏原读写接口
- `src/pages/*.js`：扩展支持食品字段展示和过敏原警告
- `src/main.js`：新增 settings 路由绑定、document.title 更新

### 27.2 禁止删除（保留化妆品原型）

- `src/data/ingredients.js`：重命名为 `src/data/cosmetic-ingredients.js`，不删除数据
- 化妆品相关页面逻辑：保留在 `/cosmetics/` 路由下，不删除

### 27.3 重命名规则

| 旧文件 | 新文件 | 说明 |
|---|---|---|
| `src/data/ingredients.js` | `src/data/cosmetic-ingredients.js` | 内容不变，路径调整 |

### 27.4 新增文件清单

迁移完成后，以下文件必须存在：

```text
src/data/food-additives.js
src/data/cosmetic-ingredients.js
src/data/allergens.js
src/pages/settingsPage.js
src/types/ingredient.js         （扩展 FoodAdditive、CosmeticIngredient 类型）
```

---

## 28. 环境变量规范

本项目不使用 Vite，环境变量名不加 `VITE_` 前缀。服务端密钥只在后端 Node.js 进程中读取，不在前端暴露。

`.env.example` 格式：

```env
# 服务端口
SERVER_PORT=8080

# OCR 服务密钥（服务端读取，不传前端）
OCR_API_KEY=

# AI 服务密钥（服务端读取，不传前端）
AI_API_KEY=

# 数据库连接（后端实现后填写）
DATABASE_URL=

# 前端可读的公开配置（无敏感信息才允许）
APP_NAME=成分小查
APP_BASE_URL=http://localhost:8080
```

前端代码只允许读取明确标注为「前端可读」的环境变量，且只能通过后端注入或构建时替换，不能直接 `process.env`。



---

## 29. AI 代码审查范围与规则

项目配置了 AI 自动审查（DeepSeek 默认，@bailian 手动切换百炼），审查范围严格限定如下。

### 29.1 只审查严重问题

AI 审查只报告以下类别的问题，其余一律忽略：

| 类别 | 示例 |
|---|---|
| 逻辑错误 | 条件判断错误、边界未处理、数据流断裂 |
| 功能缺失 | 多类别路由缺 category 字段、过敏原 key/接口不符合规范、食品必填字段缺失 |
| 安全漏洞 | HTML 未转义（XSS）、API Key 硬编码 |
| 技术栈违规 | 引入 React / Vue / TypeScript / Vite / webpack 等禁止依赖 |
| 数据损坏风险 | 写入操作破坏已有数据结构、localStorage key 冲突 |

### 29.2 不审查的内容（由开发者自行处理）

- 代码风格、缩进、空格、空行
- 变量命名、函数命名
- 注释的有无或质量
- 可以改进但不影响功能的重构建议
- 性能优化建议

### 29.3 一次性报告所有问题

AI 每次审查必须一次性列出本次 PR 中的所有严重问题，不允许在修复后再发现新的严重问题（新问题应在下一次 PR 中报告）。这样可以避免反复审查同一个 PR 造成 token 浪费。

### 29.4 触发方式

- **自动**：每次 PR 提交或更新时，DeepSeek 自动审查
- **手动**：在 PR 评论中输入 `@deepseek` 或 `@bailian` 手动触发
- **Claude 深度审查**：在 PR 评论中输入 `/claude`，用于重要大改动
