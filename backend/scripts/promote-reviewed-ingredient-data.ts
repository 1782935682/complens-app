import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type pg from 'pg';
import { getConfig } from '../src/config.js';
import { createDatabaseClient } from '../src/db/client.js';
import { assertLocalDatabaseUrl } from './ingredient-knowledge-common.js';

type ReviewResults = {
  submittedAt?: string;
  summary?: {
    total?: number;
    approved?: number;
    rejected?: number;
    manualRequired?: number;
    unreviewed?: number;
  };
  decisions?: Array<{
    report?: string;
    decision?: string;
  }>;
};

type CountRow = {
  key: string;
  count: number;
};

type PromotionResult = {
  startedAt: string;
  endedAt: string;
  dryRun: boolean;
  reviewSubmittedAt: string;
  qualifiedSources: CountRow[];
  promotedIngredientMasters: CountRow[];
  promotedSourceRelations: number;
  promotedRegulatoryRules: number;
  promotedNutritionFortifierRules: number;
  approvedStagingRows: CountRow[];
  remainingPendingIngredients: CountRow[];
  skippedSummary: CountRow[];
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const repoRoot = process.cwd().endsWith('/backend') ? resolve(process.cwd(), '..') : resolve(process.cwd());
const reviewResultsPath = resolve(repoRoot, 'docs/review-results.json');
const reportPath = resolve(repoRoot, 'docs/pending-review-promote-report.md');

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

async function runCli() {
  const config = getConfig();
  assertLocalDatabaseUrl(config.databaseUrl);
  const client = createDatabaseClient(config.databaseUrl);

  try {
    const reviewResults = await readReviewResults(reviewResultsPath);
    assertReviewApproved(reviewResults);
    const result = await promoteReviewedIngredientData(client.pool, {
      dryRun,
      reviewSubmittedAt: String(reviewResults.submittedAt || '')
    });
    await writePromotionReport(reportPath, result);
    console.log([
      'Ingredient pending-review promote completed',
      `dry_run=${String(dryRun)}`,
      `ingredients=${sumCounts(result.promotedIngredientMasters)}`,
      `source_relations=${result.promotedSourceRelations}`,
      `regulatory_rules=${result.promotedRegulatoryRules}`,
      `nutrition_fortifier_rules=${result.promotedNutritionFortifierRules}`,
      `approved_staging=${sumCounts(result.approvedStagingRows)}`,
      `report=${relativeReportPath(reportPath)}`
    ].join(' '));
  } finally {
    await client.pool.end();
  }
}

export async function promoteReviewedIngredientData(pool: pg.Pool, options: { dryRun: boolean; reviewSubmittedAt: string }): Promise<PromotionResult> {
  const startedAt = new Date();
  await pool.query('begin');
  try {
    await pool.query(`set local statement_timeout = '120s'`);
    await pool.query(`set local lock_timeout = '10s'`);
    await createCandidateTempTables(pool);

    const qualifiedSources = await queryCounts(pool, `
      select source_status || ' / ' || verification_status as key, count(*)::int as count
      from _review_promote_sources
      group by 1
      order by 1
    `);

    const promotedIngredientMasters = await updateIngredientMasters(pool);
    const promotedSourceRelations = await updateSourceRelations(pool);
    const promotedRegulatoryRules = await updateRegulatoryRules(pool);
    const promotedNutritionFortifierRules = await updateNutritionFortifierRules(pool);
    const approvedStagingRows = await updateApprovedStagingRows(pool);
    const remainingPendingIngredients = await queryRemainingPendingIngredients(pool);
    const skippedSummary = await querySkippedSummary(pool);

    const result: PromotionResult = {
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      dryRun: options.dryRun,
      reviewSubmittedAt: options.reviewSubmittedAt,
      qualifiedSources,
      promotedIngredientMasters,
      promotedSourceRelations,
      promotedRegulatoryRules,
      promotedNutritionFortifierRules,
      approvedStagingRows,
      remainingPendingIngredients,
      skippedSummary
    };

    if (options.dryRun) {
      await pool.query('rollback');
    } else {
      await pool.query('commit');
    }
    return result;
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
}

async function createCandidateTempTables(pool: pg.Pool) {
  await pool.query(`
    create temporary table _review_promote_sources on commit drop as
    select id, source_status, verification_status
    from official_sources
    where source_tier = 'S0'
      and source_status in ('verified_official_standard', 'verified_official_catalog')
      and status = 'active'
      and license = 'government_public_document'
      and verification_status = 'verified_by_local_content_and_checksum'
      and coalesce(source_url, '') not like 'local://%'
      and coalesce(local_file_path, '') <> ''
      and coalesce(content_hash, '') <> ''
      and coalesce(notes, '') not ilike '%OCR%'
      and coalesce(notes, '') not ilike '%官方页面%pending%'
      and nullif(regexp_replace(confidence_score, '[^0-9.]', '', 'g'), '')::numeric >= 0.95
  `);

  await pool.query(`
    create temporary table _review_promote_ingredient_ids on commit drop as
    select distinct m.id
    from ingredient_master m
    join ingredient_source_relations r on r.ingredient_id = m.id
    join _review_promote_sources s on s.id = r.source_id
    where m.source_status = 'pending_review'
      and m.regulatory_status = 'pending_review'
      and m.ingredient_type in ('food_additive', 'nutrition_fortifier')
      and coalesce(r.evidence_summary, '') <> ''
      and coalesce(r.source_location, '') <> ''
      and (
        r.page_number is not null
        or coalesce(r.table_name, '') <> ''
        or coalesce(r.row_reference, '') <> ''
      )
  `);
}

async function updateIngredientMasters(pool: pg.Pool) {
  return queryCounts(pool, `
    with updated as (
      update ingredient_master m
      set regulatory_status = 'verified_regulation',
          source_status = 'official',
          updated_at = now()
      from _review_promote_ingredient_ids c
      where m.id = c.id
      returning m.ingredient_type
    )
    select ingredient_type as key, count(*)::int as count
    from updated
    group by 1
    order by 1
  `);
}

async function updateSourceRelations(pool: pg.Pool) {
  return queryCount(pool, `
    with updated as (
      update ingredient_source_relations r
      set status = 'current'
      from _review_promote_ingredient_ids c, _review_promote_sources s
      where r.ingredient_id = c.id
        and r.source_id = s.id
        and r.status = 'pending_review'
      returning r.ingredient_id
    )
    select count(*)::int as count from updated
  `);
}

async function updateRegulatoryRules(pool: pg.Pool) {
  return queryCount(pool, `
    with updated as (
      update ingredient_regulatory_rules rr
      set status = 'current'
      from _review_promote_ingredient_ids c, _review_promote_sources s
      where rr.ingredient_id = c.id
        and rr.source_id = s.id
        and rr.status = 'pending_review'
        and coalesce(rr.food_category_code, '') <> ''
        and coalesce(rr.food_category_name, '') <> ''
        and rr.allowed_status in ('allowed', 'restricted')
      returning rr.id
    )
    select count(*)::int as count from updated
  `);
}

async function updateNutritionFortifierRules(pool: pg.Pool) {
  return queryCount(pool, `
    with updated as (
      update nutrition_fortifier_rules nfr
      set status = 'current'
      from _review_promote_ingredient_ids c, _review_promote_sources s, ingredient_master m
      where nfr.ingredient_id = c.id
        and m.id = c.id
        and m.ingredient_type = 'nutrition_fortifier'
        and nfr.source_id = s.id
        and nfr.status = 'pending_review'
        and coalesce(nfr.food_category_code, '') <> ''
        and coalesce(nfr.food_category_name, '') <> ''
      returning nfr.id
    )
    select count(*)::int as count from updated
  `);
}

async function updateApprovedStagingRows(pool: pg.Pool) {
  return queryCounts(pool, `
    with updated as (
      update ingredient_import_staging s
      set review_status = 'approved',
          updated_at = now()
      from _review_promote_sources qs
      where s.source_id = qs.id
        and s.review_status = 'pending_review'
        and s.record_type in ('nutrition_fortifier_rule')
      returning s.record_type
    )
    select record_type as key, count(*)::int as count
    from updated
    group by 1
    order by 1
  `);
}

async function queryRemainingPendingIngredients(pool: pg.Pool) {
  return queryCounts(pool, `
    select ingredient_type as key, count(*)::int as count
    from ingredient_master
    where source_status = 'pending_review'
       or regulatory_status = 'pending_review'
    group by 1
    order by 1
  `);
}

async function querySkippedSummary(pool: pg.Pool) {
  return queryCounts(pool, `
    select reason as key, count(*)::int as count
    from (
      select distinct m.id,
        case
          when m.ingredient_type = 'ordinary_ingredient' then 'S2 ordinary ingredient seed remains pending_review'
          when exists (
            select 1
            from ingredient_source_relations r
            join official_sources s on s.id = r.source_id
            where r.ingredient_id = m.id
              and s.notes ilike '%OCR%'
          ) then 'OCR-assisted official extraction remains pending_review'
          when exists (
            select 1
            from ingredient_source_relations r
            join official_sources s on s.id = r.source_id
            where r.ingredient_id = m.id
              and s.verification_status <> 'verified_by_local_content_and_checksum'
          ) then 'official source page or checksum verification incomplete'
          when m.ingredient_type in ('food_microorganism', 'food_medicine_substance', 'novel_food_ingredient') then 'special catalog requires dedicated row-level promotion'
          else 'not eligible for this conservative promotion batch'
        end as reason
      from ingredient_master m
      where m.source_status = 'pending_review'
         or m.regulatory_status = 'pending_review'
    ) skipped
    group by reason
    order by reason
  `);
}

async function readReviewResults(path: string): Promise<ReviewResults> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as ReviewResults;
}

function assertReviewApproved(results: ReviewResults) {
  const summary = results.summary;
  if (!summary || summary.total !== summary.approved || summary.rejected !== 0 || summary.manualRequired !== 0 || summary.unreviewed !== 0) {
    throw new Error('Review results must show all reports approved before data promotion.');
  }
  const reports = new Set((results.decisions || []).map((decision) => decision.report));
  for (const required of ['pending-review-governance-plan.md', 'data-quality-report.md', 'source-materials-missing-official.md']) {
    if (!reports.has(required)) {
      throw new Error(`Review results missing required report decision: ${required}`);
    }
  }
}

async function queryCounts(pool: pg.Pool, sql: string): Promise<CountRow[]> {
  const result = await pool.query(sql);
  return result.rows.map((row) => ({
    key: String(row.key),
    count: Number(row.count || 0)
  }));
}

async function queryCount(pool: pg.Pool, sql: string) {
  const result = await pool.query(sql);
  return Number(result.rows[0]?.count || 0);
}

async function writePromotionReport(path: string, result: PromotionResult) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderPromotionReport(result));
}

function renderPromotionReport(result: PromotionResult) {
  return `# pending_review 数据正式化报告

生成时间：${result.endedAt}

## 执行口径

- review 提交时间：${result.reviewSubmittedAt}
- dry-run：${result.dryRun ? '是' : '否'}
- 本轮只提升 S0 中国官方来源中已通过本地文件内容和 SHA-256 校验的记录。
- 本轮只处理 \`ingredient_master\`、\`ingredient_source_relations\`、\`ingredient_regulatory_rules\` 和 \`nutrition_fortifier_rules\`。
- S2 普通配料、OCR 辅助抽取、官方页面 URL 仍待补齐的目录、营养声称阈值、数字标签规则和过敏原规则继续保持待复核。

## 本轮已正式化

| 项目 | 数量 |
|---|---:|
| ingredient_master | ${sumCounts(result.promotedIngredientMasters)} |
| ingredient_source_relations -> current | ${result.promotedSourceRelations} |
| ingredient_regulatory_rules -> current | ${result.promotedRegulatoryRules} |
| nutrition_fortifier_rules -> current | ${result.promotedNutritionFortifierRules} |
| ingredient_import_staging -> approved | ${sumCounts(result.approvedStagingRows)} |

### ingredient_master 按类型

${renderCountTable(result.promotedIngredientMasters, 'ingredient_type')}

### staging approved 按类型

${renderCountTable(result.approvedStagingRows, 'record_type')}

## 使用的合格来源

${renderCountTable(result.qualifiedSources, 'source_status / verification_status')}

## 仍保留 pending_review

${renderCountTable(result.remainingPendingIngredients, 'ingredient_type')}

## 跳过原因

${renderCountTable(result.skippedSummary, 'reason')}

## 边界

- 本轮没有把任何 S2、未验证、OCR 辅助或缺官方页面定位的数据标记为官方正式数据。
- 本轮没有变更旧 \`ingredients\` / \`additive_usage_rules\` 用户端展示表；GB2760 A.1 正式规则仍由 \`promote:gb2760\` 管理。
- 被跳过的数据需要后续补官方页面、逐条核对 OCR/阈值/标签规则，或补专用 promote 逻辑后再升级。
`;
}

function renderCountTable(rows: CountRow[], label: string) {
  if (rows.length === 0) return `| ${label} | 数量 |\n|---|---:|\n| none | 0 |`;
  return `| ${label} | 数量 |\n|---|---:|\n${rows.map((row) => `| ${row.key} | ${row.count} |`).join('\n')}`;
}

function sumCounts(rows: CountRow[]) {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

function relativeReportPath(path: string) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}
