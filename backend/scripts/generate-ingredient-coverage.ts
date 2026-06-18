import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createDatabaseClient } from '../src/db/client.js';
import { getConfig } from '../src/config.js';
import {
  getIngredientKnowledgeDbStats,
  summarizeIngredientKnowledgeDataset,
  validateIngredientKnowledgeDataset
} from '../src/services/ingredientKnowledgeService.js';
import {
  assertLocalDatabaseUrl,
  loadIngredientKnowledgeDataset
} from './ingredient-knowledge-common.js';
import { runPipelinePhase } from './ingredient-official-data-pipeline.js';

const useDb = !process.argv.includes('--no-db');
const coveragePath = resolve(process.cwd(), '..', 'docs', 'ingredient-database-coverage.md');
const legacyPath = resolve(process.cwd(), '..', 'docs', 'ingredient-unverified-legacy.md');
const conflictsPath = resolve(process.cwd(), '..', 'docs', 'ingredient-alias-conflicts.md');
let client: ReturnType<typeof createDatabaseClient> | null = null;

try {
  if (useDb) {
    const config = getConfig();
    assertLocalDatabaseUrl(config.databaseUrl);
    client = createDatabaseClient(config.databaseUrl);
  }

  const dataset = await loadIngredientKnowledgeDataset(client?.db);
  const summary = summarizeIngredientKnowledgeDataset(dataset);
  const validationErrors = validateIngredientKnowledgeDataset(dataset);
  const dbStats = client ? await getIngredientKnowledgeDbStats(client.db) : null;
  const generatedAt = new Date().toISOString();
  const source = dataset.officialSources[0];
  const officialSource = {
    id: source.id,
    sourceOrg: source.sourceOrg,
    title: source.title,
    sourceUrl: source.sourceUrl,
    standardNo: source.standardNo ?? null,
    announcementNo: source.announcementNo ?? null,
    publicationDate: source.publicationDate,
    effectiveDate: source.effectiveDate ?? null,
    retrievedAt: source.retrievedAt,
    contentHash: source.contentHash,
    parserVersion: source.parserVersion
  };

  await writeGeneratedFile(coveragePath, renderCoverageMarkdown({
    generatedAt,
    summary,
    dbStats,
    validationErrorCount: validationErrors.length,
    officialSource
  }));
  await writeGeneratedFile(legacyPath, renderLegacyMarkdown({
    generatedAt,
    dataset
  }));
  await writeGeneratedFile(conflictsPath, renderConflictsMarkdown({
    generatedAt,
    dataset
  }));

  console.log(`Generated ${coveragePath}`);
  console.log(`Generated ${legacyPath}`);
  console.log(`Generated ${conflictsPath}`);
  await runPipelinePhase(useDb ? 'report' : 'inventory');
} finally {
  if (client) await client.pool.end();
}

type CoverageRenderInput = {
  generatedAt: string;
  summary: ReturnType<typeof summarizeIngredientKnowledgeDataset>;
  dbStats: Awaited<ReturnType<typeof getIngredientKnowledgeDbStats>> | null;
  validationErrorCount: number;
  officialSource: {
    id: string;
    sourceOrg: string;
    title: string;
    sourceUrl: string;
    standardNo: string | null;
    announcementNo: string | null;
    publicationDate: string;
    effectiveDate: string | null;
    retrievedAt: string;
    contentHash: string;
    parserVersion: string;
  };
};

function renderCoverageMarkdown(input: CoverageRenderInput) {
  const stats = input.dbStats;
  const byType = stats?.byType ?? input.summary.byType;
  const ruleStatus = stats?.ruleStatus ?? input.summary.rulesByStatus;
  const sourceCounts = stats?.bySource ?? { [input.officialSource.id]: input.summary.sourceRelationCount };
  const totalIngredients = stats?.totalIngredients ?? input.summary.totalIngredientCount;
  const aliasCount = stats?.aliasCount ?? input.summary.aliasCount;
  const ruleCount = stats?.ruleCount ?? input.summary.ruleCount;
  const conflictCount = stats?.conflictCount ?? input.summary.conflictCount;
  const unverifiedLegacyCount = stats?.unverifiedLegacyCount ?? input.summary.unverifiedLegacyCount;
  const officialEvidenceIngredientCount = stats?.officialEvidenceIngredientCount ?? input.summary.officialEvidenceIngredientCount;

  return `# 食品成分知识库覆盖报告

生成时间：${input.generatedAt}

统计口径：${stats ? '本地 PostgreSQL ingredient_* 知识库表实际导入结果。' : '静态官方源文件派生结果，尚未读取本地 DB。'}

## 总览

| 指标 | 数量 |
|---|---:|
| 当前食品源文件原有数据数量 | ${input.summary.existingFoodIngredientCount} |
| 本轮知识库成分主表数量 | ${totalIngredients} |
| 新增知识库成分数量 | ${input.summary.newIngredientMasterCount} |
| 有官方来源关系的成分数量 | ${officialEvidenceIngredientCount} |
| 未验证旧数据数量 | ${unverifiedLegacyCount} |
| 内部普通配料词库数量（非官方） | ${input.summary.internalLexiconCount} |
| 非中国法规安全评价旧数据数量 | ${input.summary.safetyEvaluationOnlyCount} |
| 别名数量 | ${aliasCount} |
| 规则数量 | ${ruleCount} |
| 关系数量 | ${stats?.relationCount ?? input.summary.relationCount} |
| 数据冲突数量 | ${conflictCount} |
| 解析失败数量 | ${input.validationErrorCount} |

## ingredient_type 覆盖

${renderCountTable(byType, 'ingredient_type')}

## 规则状态

${renderCountTable(ruleStatus, 'status')}

## 来源关系导入数量

${renderCountTable(sourceCounts, 'source_id')}

## GB 2760 派生来源

| 字段 | 内容 |
|---|---|
| 标准 | ${input.officialSource.standardNo || ''} |
| 标题 | ${input.officialSource.title} |
| 发布机构 | ${input.officialSource.sourceOrg} |
| 公告号 | ${input.officialSource.announcementNo || ''} |
| 发布日期 | ${input.officialSource.publicationDate} |
| 实施日期 | ${input.officialSource.effectiveDate || ''} |
| 检索日期 | ${input.officialSource.retrievedAt} |
| 官方入口 | ${input.officialSource.sourceUrl} |
| 内容 SHA-256 | ${input.officialSource.contentHash} |
| 解析器版本 | ${input.officialSource.parserVersion} |

## 当前覆盖与限制

- 普通食品原料：当前 ordinary_ingredient 为 ${byType.ordinary_ingredient ?? 0}。其中 S2 高频 OCR 种子为人工整理的 pending_review 候选，不是中国官方普通原料全量目录，也不能展示为 S0 或 verified。
- 营养强化剂：当前 nutrition_fortifier 为 ${byType.nutrition_fortifier ?? 0}，GB 14880 source-materials 结构化规则保持 pending_review，需人工复核后才能提升。
- 新食品原料：当前 novel_food_ingredient 为 ${byType.novel_food_ingredient ?? 0}，来自已保存官方目录抽取，保持 pending_review。
- 食药物质：当前 food_medicine_substance 为 ${byType.food_medicine_substance ?? 0}，来自本地官方目录抽取，保持 pending_review。
- 可用于食品的菌种：当前 food_microorganism 为 ${byType.food_microorganism ?? 0}。其中 GB 2760 表 C.3 的酶制剂来源/供体微生物和 NHC 菌种名单抽取仍需人工复核；婴幼儿菌种 PDF 无文本层，已用 RapidOCR 辅助抽取 14 条 pending_review 候选，原始 OCR JSON 已保存，不能展示为 verified。
- 过敏原、营养 NRV、营养声称和数字标签规则已进入专用表或 staging，但均保持 pending_review，不作为 verified 结论展示。
- 官方公告新增、修改、废止记录：已预留 ingredient_relations 和 valid_from/valid_to/status，本轮没有自动推断废止链。
- 完整 source-materials 覆盖、S2 种子和专用规则表数量以 [official-food-data-coverage.md](./official-food-data-coverage.md) 与 [data-quality-report.md](./data-quality-report.md) 为准。

官方别名冲突明细见 [ingredient-alias-conflicts.md](./ingredient-alias-conflicts.md)。

## 普通食品原料覆盖限制

普通食品原料没有类似 GB 2760 添加剂标准这样的统一官方全量名单。本项目不得用第三方词库或 AI 推测补齐“官方普通食品原料库”。后续只能导入能够定位到国家机关、国家标准或公告原文的结构化事实，并在覆盖报告中继续区分官方来源、内部词库和未验证旧数据。

## 后续更新命令

\`\`\`bash
npm run ingredient:inventory
npm run ingredient:fetch
npm run ingredient:extract
npm --prefix backend run db:migrate
npm run ingredient:import
npm run ingredient:ordinary-seed
npm run ingredient:validate
npm run ingredient:coverage
\`\`\`
`;
}

function renderLegacyMarkdown(input: { generatedAt: string; dataset: Awaited<ReturnType<typeof loadIngredientKnowledgeDataset>> }) {
  const legacyRows = input.dataset.ingredients
    .filter((row) => ['unverified', 'internal_lexicon', 'safety_evaluation_only'].includes(String(row.sourceStatus)))
    .sort((a, b) => String(a.sourceStatus).localeCompare(String(b.sourceStatus)) || a.canonicalName.localeCompare(b.canonicalName));
  return `# 未验证旧数据清单

生成时间：${input.generatedAt}

说明：本清单来自旧 foodAdditives/commonFoodIngredients 兼容迁移。以下记录未在本轮标记为中国官方监管数据，不得展示为已验证法规结论。

| legacy_id | 名称 | ingredient_type | source_status | regulatory_status |
|---|---|---|---|---|
${legacyRows.map((row) => `| ${row.legacyIngredientId || ''} | ${row.canonicalName} | ${row.ingredientType} | ${row.sourceStatus} | ${row.regulatoryStatus} |`).join('\n')}
`;
}

function renderConflictsMarkdown(input: { generatedAt: string; dataset: Awaited<ReturnType<typeof loadIngredientKnowledgeDataset>> }) {
  const conflicts = input.dataset.conflictReport;
  return `# 食品成分知识库别名冲突报告

生成时间：${input.generatedAt}

说明：以下冲突来自官方来源别名或编码归一化后指向多个知识库成分。本轮不自动合并这些记录，后续需人工结合原标准页码、表名和行证据处理。

| 类型 | 归一化别名 | 涉及成分 ID |
|---|---|---|
${conflicts.length === 0 ? '| none | none | none |' : conflicts.map((conflict) => `| ${conflict.type} | ${conflict.key} | ${conflict.ids.join('<br>')} |`).join('\n')}
`;
}

function renderCountTable(counts: Record<string, number>, label: string) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return `| ${label} | 数量 |\n|---|---:|\n| none | 0 |`;
  return `| ${label} | 数量 |\n|---|---:|\n${entries.map(([key, count]) => `| ${key} | ${count} |`).join('\n')}`;
}

async function writeGeneratedFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
