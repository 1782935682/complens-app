# Database

本文档记录 CompCheck 当前 PostgreSQL 设计、字段含义、初始化 SQL 入口和数据导入流程。数据库 schema 的代码源头是 [`../backend/src/db/schema.ts`](../backend/src/db/schema.ts)，初始化 SQL 的执行源头是 [`../backend/src/db/migrations/`](../backend/src/db/migrations/)。

## 当前只有一个数据库

项目只有一个本地 PostgreSQL 数据库：`compcheck`。看起来像有两个数据库，是因为同一个数据库在两个网络上下文中有两个连接地址：

| 使用场景 | 连接地址 | 原因 |
|---|---|---|
| 宿主机命令，例如 `npm run db:migrate`、`npm run db:seed` | `postgres://postgres:password@localhost:15432/compcheck` | Docker 把容器内 `5432` 映射到宿主机 `15432`，避免和本机已有 PostgreSQL 冲突 |
| Docker Compose 里的 `api` 容器 | `postgres://postgres:password@postgres:5432/compcheck` | 容器内的 `localhost` 是 API 容器自己，必须通过 Compose service name `postgres` 访问数据库容器 |

也就是说：

- `POSTGRES_DB=compcheck` 只创建一个库。
- `POSTGRES_PORT=15432` 只是宿主机端口映射。
- `postgres:5432` 是容器网络内地址，不是第二个库。

## 初始化流程

本地初始化按下面顺序执行。`db:migrate` 和 `db:seed` 在多个文档位置出现时，都是同一组后端命令，不需要重复跑两遍。

```bash
cd backend
cp .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

校验：

```bash
npm run validate:gb2760
```

相关配置：

| 文件 | 用途 |
|---|---|
| [`../backend/.env.example`](../backend/.env.example) | 本机后端环境变量模板 |
| `backend/.env` | 本机实际环境变量，不提交 |
| [`../backend/docker-compose.yml`](../backend/docker-compose.yml) | 本地 Postgres 和 API 容器 |
| [`../backend/drizzle.config.ts`](../backend/drizzle.config.ts) | Drizzle migration 配置 |

## 初始化 SQL

初始化 SQL 由 Drizzle migration 管理，按文件名顺序执行。不要手写另一份独立 schema SQL，否则容易和 `schema.ts`、migration 历史、Drizzle 迁移表产生漂移。

执行入口：

```bash
cd backend
npm run db:migrate
```

当前初始化 SQL 清单：

| 顺序 | SQL 文件 | 主要内容 |
|---:|---|---|
| 0000 | [`0000_thick_the_professor.sql`](../backend/src/db/migrations/0000_thick_the_professor.sql) | 创建 `ingredients`、`ingredient_sources` 和基础索引 |
| 0001 | [`0001_complex_maximus.sql`](../backend/src/db/migrations/0001_complex_maximus.sql) | 启用 `pg_trgm`，新增成分名称、英文名、描述和别名搜索索引 |
| 0002 | [`0002_chilly_wallflower.sql`](../backend/src/db/migrations/0002_chilly_wallflower.sql) | 创建 `users`、`sessions` |
| 0003 | [`0003_ordinary_mad_thinker.sql`](../backend/src/db/migrations/0003_ordinary_mad_thinker.sql) | 创建用户收藏、历史、过敏原、报告表 |
| 0004 | [`0004_good_timeslip.sql`](../backend/src/db/migrations/0004_good_timeslip.sql) | 给 `ingredients` 补来源、可信度、法规依据字段 |
| 0005 | [`0005_wooden_kid_colt.sql`](../backend/src/db/migrations/0005_wooden_kid_colt.sql) | 创建 `product_archives` |
| 0006 | [`0006_cute_leo.sql`](../backend/src/db/migrations/0006_cute_leo.sql) | 给 `ingredients` 补 seed 审计字段和索引 |
| 0007 | [`0007_tricky_marvel_zombies.sql`](../backend/src/db/migrations/0007_tricky_marvel_zombies.sql) | 创建 `user_profile_ingredients` |
| 0008 | [`0008_foundation_data_status.sql`](../backend/src/db/migrations/0008_foundation_data_status.sql) | 给 `ingredients` 补 `data_status`、`source_scope`、`match_confidence`、`review_note` |
| 0009 | [`0009_magical_red_skull.sql`](../backend/src/db/migrations/0009_magical_red_skull.sql) | 创建 GB2760 表 A.1 staging 表 `gb2760_official_records` |
| 0010 | [`0010_bent_boomerang.sql`](../backend/src/db/migrations/0010_bent_boomerang.sql) | 创建 GB2760 PDF 全文页表 `gb2760_official_pages` |
| 0011 | [`0011_neat_thaddeus_ross.sql`](../backend/src/db/migrations/0011_neat_thaddeus_ross.sql) | 创建 GB2760 参考表行表 `gb2760_official_reference_rows` |
| 0012 | [`0012_breezy_franklin_richards.sql`](../backend/src/db/migrations/0012_breezy_franklin_richards.sql) | 创建来源文档、导入批次、导入错误审计表 |
| 0013 | [`0013_productive_crusher_hogan.sql`](../backend/src/db/migrations/0013_productive_crusher_hogan.sql) | 创建正式 GB2760 使用规则表 `additive_usage_rules` |
| 0014 | [`0014_clean_lorna_dane.sql`](../backend/src/db/migrations/0014_clean_lorna_dane.sql) | 给 `ingredients` 增加 GB2760 promote 前的基础状态快照 |
| 0015 | [`0015_fresh_vampiro.sql`](../backend/src/db/migrations/0015_fresh_vampiro.sql) | 给 `additive_usage_rules.source_staging_id` 增加 staging 外键 |
| 0016 | [`0016_large_moonstone.sql`](../backend/src/db/migrations/0016_large_moonstone.sql) | 给 GB2760 staging 增加人工复核审计字段 |

## 表分层

| 层级 | 表 | 含义 |
|---|---|---|
| 成分正式库 | `ingredients`、`ingredient_sources`、`additive_usage_rules` | 用户查询、报告展示和正式法规使用规则 |
| GB2760 staging | `gb2760_official_records`、`gb2760_official_pages`、`gb2760_official_reference_rows` | 官方 PDF 全文、表 A.1 行级抽取和参考表结构化承接层 |
| 导入审计 | `source_documents`、`import_runs`、`import_errors` | 官方来源文档、seed/promote 批次和失败原因 |
| 账号会话 | `users`、`sessions` | 登录、JWT 会话和登出失效 |
| 用户数据 | `user_favorites`、`user_history`、`user_allergens`、`user_profile_ingredients`、`user_reports`、`product_archives` | 收藏、搜索历史、过敏原、关注/避免成分、报告和产品档案 |

## 关键状态枚举

| 字段 | 当前值 | 含义 |
|---|---|---|
| `ingredients.data_status` | `verified_regulation`、`verified_jecfa`、`pending_review`、`mapped_candidate`、`common_ingredient`、`unverified`、`unknown_from_ocr` | 数据可信层级 |
| `gb2760_official_records.review_status` | `pending_review`、`mapped_candidate`、`approved`、`promoted`、`verified` | staging 复核和准入状态 |
| `import_runs.run_type` | `fulltext`、`a1_staging`、`reference_tables`、`promote` | 导入或准入批次类型 |
| `import_runs.status` | `running`、`succeeded`、`failed` | 批次执行状态 |
| `user_profile_ingredients.kind` | `watch`、`avoid` | 用户关注或避免的成分 |

## 表与字段

### `ingredients`

正式成分库。包含食品添加剂、普通配料、JECFA-only 记录、GB2760 promote 后的正式法规状态。

| 字段 | 含义 |
|---|---|
| `id` | 成分稳定 ID |
| `kind` | 成分大类，例如 additive / ingredient |
| `data_category` | 数据分类，用于区分食品添加剂、普通配料等来源集合 |
| `name_cn` | 中文名称 |
| `name_en` | 英文名称 |
| `aliases` | 别名数组，支持中文别名、英文别名、编码别名 |
| `category` | 业务分类或添加剂类别 |
| `functions` | 功能类别数组 |
| `description` | 用户可读说明 |
| `risk_level` | 展示层风险等级 |
| `risk_summary` | 风险摘要 |
| `suitable_for` | 适合人群或适用说明 |
| `caution_for` | 需注意人群或场景 |
| `source_note` | 来源说明 |
| `source_references` | 来源引用数组，包含标题、标准、地区、URL、发布日期和检索日期 |
| `review_status` | 记录审核状态，偏业务展示 |
| `data_status` | 数据可信状态，决定是否能权威展示 |
| `data_version` | seed 或数据批次版本 |
| `reviewed_by` | seed 或人工审核操作者 |
| `reviewed_at` | seed 或人工审核时间 |
| `change_note` | 本次变更说明 |
| `updated_at` | 源数据更新时间文本 |
| `source_name` | 主要来源名称 |
| `source_type` | 来源类型，例如官方标准、JECFA、普通词库 |
| `source_scope` | 来源用途范围，例如 GB2760 法规、安全评价、普通词库 |
| `source_version` | 来源版本 |
| `source_url` | 来源 URL |
| `effective_date` | 标准或数据生效日期 |
| `confidence_level` | 早期可信度字段，保留兼容 |
| `match_confidence` | 匹配置信度，不等于法规可信度 |
| `last_reviewed_at` | 来源或人工最后核验日期文本 |
| `review_note` | 审核备注 |
| `regulatory_basis` | 法规依据或安全评价依据 |
| `raw_source_text` | 原始来源文本或可追溯摘要 |
| `is_verified` | 是否已完成权威核验 |
| `gb_code` | GB/CNS 或项目内 GB 编码字段 |
| `gb_status` | GB2760 相关状态说明 |
| `e_number` | E 编号 |
| `adi` | ADI 或安全评价摘要 |
| `usage_limits` | 正式使用范围数组，只有可信来源准入后才可写入 |
| `food_categories` | 已确认关联食品类别 |
| `gb2760_promotion_base_state` | GB2760 promote 前的基础状态快照，用于回滚或部分 promote |
| `allergen_types` | 过敏原类型数组 |
| `caution_groups` | 关注人群分组 |
| `created_at` | DB 创建时间 |
| `synced_at` | DB 同步时间 |

### `ingredient_sources`

成分来源引用的拆分表，便于按来源索引。

| 字段 | 含义 |
|---|---|
| `ingredient_id` | 关联 `ingredients.id` |
| `source_index` | 同一成分的来源顺序 |
| `title` | 来源标题 |
| `standard` | 标准或数据库名称 |
| `region` | 来源地区 |
| `url` | 来源链接 |
| `published_at` | 发布日期 |
| `retrieved_at` | 检索日期 |

### `gb2760_official_records`

GB 2760-2024 表 A.1 行级 staging 表。每行是“添加剂 x 食品类别 x 限量/备注”的原文承接，不能直接等同正式法规结论。

| 字段 | 含义 |
|---|---|
| `id` | staging 行稳定 ID |
| `ingredient_id` | 可选关联 `ingredients.id`，无法可靠匹配时为空 |
| `standard_code` | 标准号 |
| `standard_title` | 标准标题 |
| `table_name` | 来源表名，例如 A.1 |
| `additive_name_cn` | 添加剂中文名称 |
| `additive_name_en` | 添加剂英文名称 |
| `cns_number` | CNS 编号 |
| `ins_number` | INS 编号 |
| `function_text` | 功能类别原文 |
| `food_category_code` | 食品分类号 |
| `food_category_name` | 食品类别名称 |
| `max_use_level` | 最大使用量或“按生产需要适量使用”等原文 |
| `unit` | 限量单位 |
| `note` | 表格备注和脚注信息 |
| `pdf_page` | PDF 页码 |
| `standard_page` | 标准正文页码 |
| `raw_source_text` | 原始行文本 |
| `source_name` | 来源名称 |
| `source_type` | 来源类型 |
| `source_url` | 来源 URL |
| `download_endpoint` | 官方下载接口 |
| `platform_record_id` | 食品安全国家标准平台记录 ID |
| `announcement_record_id` | 公告记录 ID |
| `file_guid` | 官方附件 GUID |
| `fact_name` | 官方平台 fact name |
| `pdf_sha256` | 官方 PDF SHA-256 |
| `retrieved_at` | 抓取或生成日期 |
| `extraction_status` | 抽取状态 |
| `review_status` | staging 复核状态 |
| `reviewed_by` | 人工复核邮箱或系统标识 |
| `reviewed_by_user_id` | 人工复核用户 ID |
| `reviewed_at` | 人工复核时间 |
| `review_note` | 人工复核备注 |
| `created_at` | DB 创建时间 |
| `synced_at` | DB 同步时间 |

### `gb2760_official_pages`

GB 2760 官方 PDF 全文页表，用于保留完整原文证据。

| 字段 | 含义 |
|---|---|
| `id` | 页记录 ID |
| `standard_code` | 标准号 |
| `standard_title` | 标准标题 |
| `pdf_page` | PDF 页码，唯一 |
| `standard_page_label` | 标准页码标签 |
| `text` | 该页 `pdftotext -layout` 文本 |
| `text_sha256` | 页文本 SHA-256 |
| `source_name` | 来源名称 |
| `source_type` | 来源类型 |
| `source_url` | 来源 URL |
| `download_endpoint` | 官方下载接口 |
| `platform_record_id` | 平台记录 ID |
| `announcement_record_id` | 公告记录 ID |
| `file_guid` | 官方附件 GUID |
| `fact_name` | 官方平台 fact name |
| `pdf_sha256` | PDF SHA-256 |
| `retrieved_at` | 获取日期 |
| `extraction_tool` | 抽取工具 |
| `extraction_scope` | 抽取范围 |
| `generated_at` | 数据生成时间 |
| `created_at` | DB 创建时间 |
| `synced_at` | DB 同步时间 |

### `gb2760_official_reference_rows`

GB 2760 非 A.1 限量表的参考表结构化行，覆盖 A.2、B、C、D、E、F 等表。

| 字段 | 含义 |
|---|---|
| `id` | 参考表行 ID |
| `standard_code` | 标准号 |
| `standard_title` | 标准标题 |
| `table_name` | 表号 |
| `table_title` | 表标题 |
| `row_number` | 表内行号 |
| `row_code` | 行编码 |
| `row_name` | 行名称 |
| `row_data` | 结构化扩展字段，例如脚注、分类层级、剂量条件 |
| `pdf_page` | PDF 页码 |
| `standard_page` | 标准页码 |
| `raw_source_text` | 原始行文本 |
| `source_name` | 来源名称 |
| `source_type` | 来源类型 |
| `source_url` | 来源 URL |
| `download_endpoint` | 官方下载接口 |
| `platform_record_id` | 平台记录 ID |
| `announcement_record_id` | 公告记录 ID |
| `file_guid` | 官方附件 GUID |
| `fact_name` | 官方平台 fact name |
| `pdf_sha256` | PDF SHA-256 |
| `retrieved_at` | 获取日期 |
| `extraction_tool` | 抽取工具 |
| `extraction_scope` | 抽取范围 |
| `generated_at` | 数据生成时间 |
| `extraction_status` | 抽取状态 |
| `review_status` | 复核状态 |
| `created_at` | DB 创建时间 |
| `synced_at` | DB 同步时间 |

### `additive_usage_rules`

正式 GB2760 使用规则表。只接收人工签核并通过 promote 的 staging 行。

| 字段 | 含义 |
|---|---|
| `id` | 规则 ID |
| `ingredient_id` | 关联 `ingredients.id` |
| `food_category_code` | 食品分类号 |
| `food_category_name` | 食品类别名称 |
| `max_use_level` | 最大使用量或原文限量表达 |
| `unit` | 单位 |
| `function_text` | 功能类别 |
| `note` | 备注 |
| `source_staging_id` | 来源 staging 行 ID，唯一 |
| `source_page` | 来源 PDF 页码 |
| `source_table` | 来源表名 |
| `source_hash` | 来源字段指纹，用于变更追踪 |
| `data_status` | 固定要求为 `verified_regulation` |
| `created_at` | DB 创建时间 |

### `source_documents`

官方来源文档登记表。

| 字段 | 含义 |
|---|---|
| `id` | 来源文档 ID |
| `doc_code` | 标准号或文档编码 |
| `title` | 文档标题 |
| `pdf_file_name` | 官方 PDF 文件名 |
| `pdf_sha256` | PDF SHA-256，唯一 |
| `platform_record_id` | 平台记录 ID |
| `attachment_id` | 附件 ID |
| `publish_date` | 发布日期 |
| `effective_date` | 实施日期 |
| `download_endpoint` | 官方下载接口 |
| `created_at` | DB 创建时间 |

### `import_runs`

导入和 promote 批次审计表。

| 字段 | 含义 |
|---|---|
| `id` | 批次 ID |
| `source_document_id` | 关联 `source_documents.id` |
| `run_type` | 批次类型 |
| `started_at` | 开始时间 |
| `ended_at` | 结束时间 |
| `total_rows` | 计划处理行数 |
| `succeeded_rows` | 成功行数 |
| `failed_rows` | 失败行数 |
| `status` | 批次状态 |
| `note` | 批次备注 |

### `import_errors`

导入和 promote 错误明细表。

| 字段 | 含义 |
|---|---|
| `id` | 错误记录 ID |
| `import_run_id` | 关联 `import_runs.id` |
| `row_ref` | 失败行引用 |
| `reason` | 失败原因 |
| `raw_source_text` | 失败行原文或上下文 |
| `created_at` | DB 创建时间 |

### `users`

登录用户表。

| 字段 | 含义 |
|---|---|
| `id` | 用户 ID |
| `email` | 邮箱，唯一 |
| `password_hash` | 密码哈希 |
| `created_at` | 注册时间 |

### `sessions`

JWT 会话失效控制表。

| 字段 | 含义 |
|---|---|
| `token` | 会话 token |
| `user_id` | 关联用户 |
| `expires_at` | 过期时间 |

### `user_favorites`

用户收藏成分表。

| 字段 | 含义 |
|---|---|
| `user_id` | 用户 ID |
| `category` | 收藏分类 |
| `ingredient_id` | 成分 ID |
| `created_at` | 收藏时间 |

### `user_history`

用户搜索历史表。

| 字段 | 含义 |
|---|---|
| `user_id` | 用户 ID |
| `query` | 搜索词 |
| `created_at` | 搜索时间 |

### `user_allergens`

用户过敏原配置表。

| 字段 | 含义 |
|---|---|
| `user_id` | 用户 ID |
| `allergen_id` | 过敏原 ID |
| `updated_at` | 更新时间 |

### `user_profile_ingredients`

用户关注或避免的成分表。

| 字段 | 含义 |
|---|---|
| `user_id` | 用户 ID |
| `kind` | `watch` 或 `avoid` |
| `ingredient_id` | 成分 ID |
| `updated_at` | 更新时间 |

### `user_reports`

用户分析报告表。

| 字段 | 含义 |
|---|---|
| `user_id` | 用户 ID |
| `report_id` | 报告 ID |
| `category` | 报告分类 |
| `data` | 报告 JSON 数据 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

### `product_archives`

用户保存的产品档案表。

| 字段 | 含义 |
|---|---|
| `user_id` | 用户 ID |
| `id` | 产品档案 ID |
| `category` | 产品分类 |
| `product_name` | 产品名称 |
| `brand_name` | 品牌名称 |
| `thumbnail_url` | 缩略图 |
| `original_text` | OCR 或用户确认后的原始配料文本 |
| `parsed_ingredients` | 拆分后的配料数组 |
| `match_results` | 成分匹配结果数组 |
| `report_id` | 关联报告 ID |
| `risk_grade` | 报告风险等级 |
| `is_favorite` | 是否收藏 |
| `tags` | 用户标签 |
| `data` | 产品档案完整 JSON 数据 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

## Seed 与数据写入

`npm run db:seed` 执行 [`../backend/scripts/seed.ts`](../backend/scripts/seed.ts)，当前写入：

| 目标表 | 来源 | 行为 |
|---|---|---|
| `ingredients` | [`../src/data/foodAdditives.js`](../src/data/foodAdditives.js) | upsert 食品添加剂和普通配料基础库 |
| `source_documents` | GB2760 staging source metadata | upsert 官方 PDF 来源登记 |
| `gb2760_official_records` | [`../src/data/gb2760OfficialStaging.js`](../src/data/gb2760OfficialStaging.js) | upsert 表 A.1 staging 行，并尽量保留未变更行的人工复核状态 |
| `gb2760_official_pages` | [`../src/data/gb2760OfficialFullText.js`](../src/data/gb2760OfficialFullText.js) | upsert PDF 全文页 |
| `gb2760_official_reference_rows` | [`../src/data/gb2760OfficialReferenceTables.js`](../src/data/gb2760OfficialReferenceTables.js) | upsert 官方参考表结构化行 |
| `import_runs` / `import_errors` | seed 脚本 | 记录 `a1_staging`、`fulltext`、`reference_tables` 批次和错误 |

`npm run promote:gb2760` 只处理 DB staging 中 `review_status in ('approved', 'promoted')` 的行。成功后写入 `additive_usage_rules`，并同步更新对应 `ingredients` 行的 GB2760 正式法规状态。`pending_review`、`mapped_candidate` 和缺失关键字段的 staging 行不得进入正式表。
