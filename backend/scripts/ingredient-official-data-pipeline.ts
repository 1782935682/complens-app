import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile
} from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve
} from 'node:path';
import type pg from 'pg';
import { createDatabaseClient } from '../src/db/client.js';
import { getConfig } from '../src/config.js';
import { assertLocalDatabaseUrl } from './ingredient-knowledge-common.js';

const execFileAsync = promisify(execFile);
const parserName = 'ingredient-official-source-pipeline';
const parserVersion = 'ingredient-official-source-pipeline-v1';
const supportedExtensions = new Set(['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.html', '.htm']);
const officialAllowedDomains = ['nhc.gov.cn', 'zwfw.nhc.gov.cn', 'cfsa.net.cn', 'sppt.cfsa.net.cn', 'samr.gov.cn', 'std.samr.gov.cn', 'openstd.samr.gov.cn', 'gov.cn'];
const sourceMaterialsRelativeDir = join('docs', 'source-materials');
const downloadedSourceMaterialsRelativeDir = join(sourceMaterialsRelativeDir, 'downloaded');

export type SourceManifestItem = {
  source_id: string;
  source_tier: string;
  source_status: string;
  source_type: string;
  title: string;
  standard_no: string;
  announcement_no: string;
  source_org: string;
  official_page_url: string;
  attachment_url: string;
  original_source_url: string;
  local_file_path: string;
  file_type: string;
  file_size: number;
  sha256: string;
  publication_date: string;
  effective_date: string;
  expiry_date: string;
  retrieved_at: string;
  source_version: string;
  license: string;
  parser_name: string;
  parser_version: string;
  parse_status: string;
  verification_status: string;
  confidence_score: string;
  supersedes_source_id: string;
  superseded_by_source_id: string;
  notes: string;
};

export type StagingRecord = {
  id: string;
  source_id: string;
  source_tier: string;
  source_status: string;
  record_type: string;
  canonical_name: string;
  normalized_name: string;
  ingredient_type: string;
  page_number: number | null;
  table_name: string;
  row_reference: string;
  raw_source_text: string;
  parsed_data: Record<string, unknown>;
  parse_status: string;
  review_status: string;
  confidence_score: string;
  content_hash: string;
};

export type PipelineSnapshot = {
  generated_at: string;
  sources: SourceManifestItem[];
  duplicates: Array<{ sha256: string; paths: string[] }>;
  staging_records: StagingRecord[];
  failed: Array<{ source_id: string; local_file_path: string; stage: string; reason: string }>;
  manual_downloads: ManualDownloadItem[];
};

type ManualDownloadItem = {
  title: string;
  standard_no: string;
  announcement_no: string;
  source_org: string;
  official_page_url: string;
  attachment_url: string;
  suggested_file_name: string;
  reason: string;
  category: string;
  priority: string;
};

type KnownSourceMetadata = {
  match: string;
  slug: string;
  source_tier: string;
  source_status: string;
  source_type: string;
  title: string;
  standard_no?: string;
  announcement_no?: string;
  source_org: string;
  official_page_url?: string;
  attachment_url?: string;
  original_source_url?: string;
  publication_date?: string;
  effective_date?: string;
  source_version?: string;
  license?: string;
  verification_status?: string;
  confidence_score?: string;
  notes?: string;
};

const knownSources: KnownSourceMetadata[] = [
  {
    match: 'GB_2760-2024',
    slug: 'gb2760-2024',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_standard',
    title: '食品安全国家标准 食品添加剂使用标准',
    standard_no: 'GB 2760-2024',
    announcement_no: '2024年第1号',
    source_org: '国家卫生健康委员会 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    attachment_url: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    publication_date: '2024-02-08',
    effective_date: '2025-02-08',
    source_version: 'GB 2760-2024',
    confidence_score: '0.98'
  },
  {
    match: '1742974306979.pdf',
    slug: 'gb7718-2025',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_standard',
    title: '食品安全国家标准 预包装食品标签通则',
    standard_no: 'GB 7718-2025',
    announcement_no: '2025年第2号',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    attachment_url: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2025-03-16',
    effective_date: '2027-03-16',
    source_version: 'GB 7718-2025',
    confidence_score: '0.98',
    notes: 'CFSA/SPPT record_id=63F005D7-BA6F-428C-8098-826735B6C13E; file_guid=406A8D4B-459E-4560-A32A-8F001971A027; fact_name=1742974306979.pdf.'
  },
  {
    match: '1742974382329.pdf',
    slug: 'gb28050-2025',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_standard',
    title: '食品安全国家标准 预包装食品营养标签通则',
    standard_no: 'GB 28050-2025',
    announcement_no: '2025年第2号',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    attachment_url: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2025-03-16',
    effective_date: '2027-03-16',
    source_version: 'GB 28050-2025',
    confidence_score: '0.98',
    notes: 'CFSA/SPPT record_id=01848F78-13AB-4F40-9DF8-DE1158E7BC26; file_guid=BDCADC64-8B8A-44BC-B143-76341F2E33F7; fact_name=1742974382329.pdf.'
  },
  {
    match: '1401948086918.pdf',
    slug: 'gb7718-2011',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_standard',
    title: '食品安全国家标准 预包装食品标签通则',
    standard_no: 'GB 7718-2011',
    source_org: '中华人民共和国卫生部 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    attachment_url: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2011-04-20',
    effective_date: '2012-04-20',
    source_version: 'GB 7718-2011',
    confidence_score: '0.97',
    notes: 'CFSA/SPPT record_id=9058ADC5-AFC3-4586-9798-D0170F6F879C; file_guid=73D485F1-70F3-4953-BF42-5E18693E4494; fact_name=1401948086918.pdf.'
  },
  {
    match: 'GB_28050-2011_预包装食品营养标签通则.pdf',
    slug: 'gb28050-2011',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_standard',
    title: '食品安全国家标准 预包装食品营养标签通则',
    standard_no: 'GB 28050-2011',
    source_org: '中华人民共和国卫生部 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    attachment_url: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2011-10-12',
    effective_date: '2013-01-01',
    source_version: 'GB 28050-2011',
    confidence_score: '0.97',
    notes: 'CFSA/SPPT record_id=C89C7E02-42FF-4D74-BE85-EB4E764EE210; file_guid=B2E21699-3906-4D0B-B5CB-1F21C52148E0; fact_name=1401947724374.pdf; saved as normalized filename.'
  },
  {
    match: 'cfsa-gb7718-2025-qa.html',
    slug: 'gb7718-2025-qa',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_qa',
    title: '《食品安全国家标准 预包装食品标签通则》（GB 7718-2025）解读材料',
    standard_no: 'GB 7718-2025',
    announcement_no: '2025年第2号',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?type=3&guid=A669616B-7964-45DE-8573-D8A9219D418F',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2025-03-16',
    effective_date: '2027-03-16',
    source_version: 'GB 7718-2025 解读材料',
    confidence_score: '0.96',
    notes: 'CFSA/SPPT interpretation_id=A669616B-7964-45DE-8573-D8A9219D418F; saved by POST task=goto.'
  },
  {
    match: 'cfsa-gb28050-2025-qa.html',
    slug: 'gb28050-2025-qa',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_qa',
    title: '《食品安全国家标准 预包装食品营养标签通则》（GB 28050-2025）解读材料',
    standard_no: 'GB 28050-2025',
    announcement_no: '2025年第2号',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?type=3&guid=3BB745AB-C782-4A1A-AD6A-A9204730B6BB',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2025-03-16',
    effective_date: '2027-03-16',
    source_version: 'GB 28050-2025 解读材料',
    confidence_score: '0.96',
    notes: 'CFSA/SPPT interpretation_id=3BB745AB-C782-4A1A-AD6A-A9204730B6BB; saved by POST task=goto.'
  },
  {
    match: 'cfsa-2025-no2-food-safety-standards-notice.html',
    slug: '2025-no2-food-safety-standards-notice',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_notice',
    title: '关于发布《食品安全国家标准 预包装食品标签通则》（GB 7718-2025）等50项食品安全国家标准和9项修改单的公告（2025年 第2号）',
    announcement_no: '2025年第2号',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局 / 食品安全国家标准数据检索平台',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?type=1&guid=0E99F438-65C1-4622-B720-C5F8309ABE5E',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db',
    publication_date: '2025-03-16',
    effective_date: '2027-03-16',
    source_version: '2025年第2号公告',
    confidence_score: '0.96',
    notes: 'CFSA/SPPT announcement_id=0E99F438-65C1-4622-B720-C5F8309ABE5E; saved by POST task=goto.'
  },
  {
    match: 'nhc-samr-digital-label-2025-notice.html',
    slug: 'nhc-samr-digital-label-2025-notice',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_notice',
    title: '国家卫生健康委、市场监管总局关于实施预包装食品数字标签有关事项的公告',
    source_org: '国家卫生健康委、市场监管总局',
    official_page_url: 'https://www.nhc.gov.cn/',
    original_source_url: 'https://www.nhc.gov.cn/',
    publication_date: '2025-09-08',
    source_version: '预包装食品数字标签公告',
    confidence_score: '0.95',
    notes: 'Official NHC/SAMR notice HTML. File must be saved from official NHC or SAMR page, not from third-party reposts.'
  },
  {
    match: 'GB-14880-2012',
    slug: 'gb14880-2012',
    source_tier: 'S0',
    source_status: 'verified_official_standard',
    source_type: 'official_standard',
    title: '食品安全国家标准 食品营养强化剂使用标准',
    standard_no: 'GB 14880-2012',
    source_org: '中华人民共和国卫生部',
    official_page_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    original_source_url: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
    publication_date: '2012-03-15',
    effective_date: '2013-01-01',
    source_version: 'GB 14880-2012',
    confidence_score: '0.95'
  },
  {
    match: '2023年“三新食品”汇总目录',
    slug: 'sanxin-2023-catalog',
    source_tier: 'S0',
    source_status: 'verified_official_catalog',
    source_type: 'official_catalog',
    title: '“三新食品”目录及适用的食品安全标准',
    source_org: '国家食品安全风险评估中心',
    official_page_url: 'https://www.cfsa.net.cn/',
    original_source_url: 'https://www.cfsa.net.cn/',
    publication_date: '2023-12-31',
    source_version: '2023汇总目录',
    verification_status: 'local_file_content_verified_official_page_pending',
    confidence_score: '0.86',
    notes: '本地文件内容为三新食品目录附件；精确公告页面 URL 需后续人工补齐。'
  },
  {
    match: '党参等 9 种食药物质目录',
    slug: 'food-medicine-9',
    source_tier: 'S0',
    source_status: 'verified_official_catalog',
    source_type: 'official_catalog',
    title: '党参等 9 种新增按照传统既是食品又是中药材的物质目录',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局',
    official_page_url: 'https://www.nhc.gov.cn/',
    original_source_url: 'https://www.nhc.gov.cn/',
    source_version: '食药物质新增目录',
    verification_status: 'local_file_content_verified_official_page_pending',
    confidence_score: '0.86'
  },
  {
    match: '地黄等 4 种食药物质目录',
    slug: 'food-medicine-4',
    source_tier: 'S0',
    source_status: 'verified_official_catalog',
    source_type: 'official_catalog',
    title: '地黄等 4 种新增按照传统既是食品又是中药材的物质目录',
    source_org: '国家卫生健康委员会 / 国家市场监督管理总局',
    official_page_url: 'https://www.nhc.gov.cn/',
    original_source_url: 'https://www.nhc.gov.cn/',
    source_version: '食药物质新增目录',
    verification_status: 'local_file_content_verified_official_page_pending',
    confidence_score: '0.86'
  },
  {
    match: '可用于食品的菌种名单',
    slug: 'food-microorganism-general',
    source_tier: 'S0',
    source_status: 'verified_official_catalog',
    source_type: 'official_catalog',
    title: '可用于食品的菌种名单',
    source_org: '国家卫生健康委员会',
    official_page_url: 'https://www.nhc.gov.cn/',
    original_source_url: 'https://www.nhc.gov.cn/',
    source_version: '食品菌种名单',
    verification_status: 'local_file_content_verified_official_page_pending',
    confidence_score: '0.86'
  },
  {
    match: '可用于婴幼儿食品的菌种名单',
    slug: 'food-microorganism-infant',
    source_tier: 'S0',
    source_status: 'verified_official_catalog',
    source_type: 'official_catalog',
    title: '可用于婴幼儿食品的菌种名单',
    source_org: '国家卫生健康委员会',
    official_page_url: 'https://www.nhc.gov.cn/',
    original_source_url: 'https://www.nhc.gov.cn/',
    source_version: '婴幼儿食品菌种名单',
    verification_status: 'local_file_content_verified_official_page_pending',
    confidence_score: '0.80',
    notes: '本地 PDF 无文本层；本轮保存 RapidOCR 原始结果作为 OCR 辅助抽取证据，解析结果仅进入 pending_review。'
  }
];

const manualDownloadTargets: ManualDownloadItem[] = [
  {
    title: '国家卫生健康委、市场监管总局关于实施预包装食品数字标签有关事项的公告',
    standard_no: '',
    announcement_no: '',
    source_org: '国家卫生健康委、市场监管总局',
    official_page_url: 'https://www.nhc.gov.cn/',
    attachment_url: '',
    suggested_file_name: 'nhc-samr-digital-label-2025-notice.html',
    reason: 'CFSA/SPPT 检索“预包装食品数字标签”“关于实施预包装食品数字标签有关事项的公告”未命中独立公告；NHC 页面访问返回反爬挑战，SAMR 搜索入口未返回可核验详情页。本轮不能用第三方转载页面替代 S0。',
    category: '数字标签规则',
    priority: 'P1'
  }
];

export function getPipelinePaths() {
  const root = getRepoRoot();
  return {
    root,
    sourceDir: join(root, sourceMaterialsRelativeDir),
    downloadedDir: join(root, downloadedSourceMaterialsRelativeDir),
    docsDir: join(root, 'docs'),
    dataDir: join(root, 'data', 'official_sources'),
    rawDir: join(root, 'data', 'official_sources', 'raw'),
    manifestsDir: join(root, 'data', 'official_sources', 'manifests'),
    extractedDir: join(root, 'data', 'official_sources', 'extracted'),
    stagingDir: join(root, 'data', 'official_sources', 'staging'),
    reportsDir: join(root, 'data', 'official_sources', 'reports'),
    failedDir: join(root, 'data', 'official_sources', 'failed'),
    checksumsDir: join(root, 'data', 'official_sources', 'checksums')
  };
}

export async function runPipelinePhase(phase: string) {
  if (phase === 'inventory') {
    const snapshot = await buildPipelineSnapshot({ extract: false });
    await writePipelineArtifacts(snapshot);
    await writeOfficialReports(snapshot, null);
    printSnapshotSummary(snapshot);
    return;
  }
  if (phase === 'fetch') {
    const snapshot = await buildPipelineSnapshot({ extract: false });
    await writePipelineArtifacts(snapshot);
    await writeManualDownloadReport(snapshot);
    console.log('Fetch phase completed. No unverified third-party fallback was downloaded.');
    return;
  }
  if (phase === 'extract' || phase === 'import-staging') {
    const snapshot = await buildPipelineSnapshot({ extract: true });
    await writePipelineArtifacts(snapshot);
    if (phase === 'import-staging') {
      const client = await createLocalClient();
      try {
        await importSourcesAndStaging(client.pool, snapshot, { promoteRecords: false });
        console.log(`Imported ${snapshot.staging_records.length} source-material staging record(s) without promotion.`);
      } finally {
        await client.pool.end();
      }
    }
    printSnapshotSummary(snapshot);
    return;
  }
  if (phase === 'promote') {
    await importPipelineToLocalDatabase();
    return;
  }
  if (phase === 'validate') {
    const client = await createLocalClient();
    try {
      const stats = await getOfficialDataDbStats(client.pool);
      const errors = validateDbStats(stats);
      if (errors.length > 0) {
        throw new Error(`Official ingredient data validation failed:\n${errors.join('\n')}`);
      }
      console.log('Official ingredient data validation passed.');
      console.log(JSON.stringify(stats, null, 2));
    } finally {
      await client.pool.end();
    }
    return;
  }
  if (phase === 'report') {
    const snapshot = await buildPipelineSnapshot({ extract: true });
    const client = await createLocalClient();
    try {
      await writeOfficialReports(snapshot, client.pool);
    } finally {
      await client.pool.end();
    }
    return;
  }
  if (phase === 'update-all') {
    const snapshot = await buildPipelineSnapshot({ extract: true });
    await writePipelineArtifacts(snapshot);
    await importPipelineToLocalDatabase(snapshot);
    const client = await createLocalClient();
    try {
      await writeOfficialReports(snapshot, client.pool);
    } finally {
      await client.pool.end();
    }
    return;
  }
  throw new Error(`Unknown ingredient data pipeline phase: ${phase}`);
}

export async function buildPipelineSnapshot(options: { extract: boolean }): Promise<PipelineSnapshot> {
  const paths = getPipelinePaths();
  await ensureDirs();
  const files = await listSourceFiles(paths.sourceDir);
  const sources = await Promise.all(files.map((filePath) => buildSourceManifestItem(filePath)));
  const duplicates = findDuplicateSources(sources);
  const failed: PipelineSnapshot['failed'] = [];
  const stagingRecords: StagingRecord[] = [];

  if (options.extract) {
    for (const source of sources) {
      try {
        const text = await extractSourceText(source);
        if (!text.trim()) {
          failed.push({
            source_id: source.source_id,
            local_file_path: source.local_file_path,
            stage: 'extract',
            reason: 'pdftotext produced empty text; OCR is intentionally not used for official data promotion.'
          });
          source.parse_status = 'failed_no_text_layer';
          continue;
        }
        stagingRecords.push(...parseSourceRecords(source, text));
        source.parse_status = 'parsed';
      } catch (error) {
        failed.push({
          source_id: source.source_id,
          local_file_path: source.local_file_path,
          stage: 'extract',
          reason: error instanceof Error ? error.message : String(error)
        });
        source.parse_status = 'failed';
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    sources: sources.sort((a, b) => a.local_file_path.localeCompare(b.local_file_path)),
    duplicates,
    staging_records: dedupeRecords(stagingRecords),
    failed,
    manual_downloads: buildManualDownloadItems(sources)
  };
}

function buildManualDownloadItems(sources: SourceManifestItem[]) {
  const savedFiles = new Set(sources.map((source) => basename(source.local_file_path)));
  return manualDownloadTargets.filter((item) => !savedFiles.has(item.suggested_file_name));
}

export async function importPipelineToLocalDatabase(snapshot?: PipelineSnapshot) {
  const client = await createLocalClient();
  try {
    const current = snapshot ?? await buildPipelineSnapshot({ extract: true });
    await importSourcesAndStaging(client.pool, current, { promoteRecords: true });
    console.log(`Imported official source inventory and ${current.staging_records.length} staging record(s).`);
  } finally {
    await client.pool.end();
  }
}

async function importSourcesAndStaging(pool: pg.Pool, snapshot: PipelineSnapshot, options: { promoteRecords: boolean }) {
  await pool.query('begin');
  try {
    await pool.query(`set local statement_timeout = '120s'`);
    await pool.query(`set local lock_timeout = '10s'`);
    for (const source of snapshot.sources) {
      await upsertOfficialSource(pool, source);
    }
    await upsertStagingRecords(pool, snapshot.staging_records);
    for (const record of snapshot.staging_records) {
      if (options.promoteRecords && record.record_type === 'nutrition_reference_value') {
        await upsertNutritionReferenceValue(pool, record);
      }
      if (options.promoteRecords && (record.record_type === 'nutrition_comparative_claim_rule' || record.record_type === 'nutrition_content_claim_rule')) {
        await upsertNutritionClaimRule(pool, record);
      }
      if (options.promoteRecords && record.record_type === 'nutrition_polyol_energy_rule') {
        await upsertNutritionPolyolEnergyRule(pool, record);
      }
      if (options.promoteRecords && record.record_type === 'allergen_category') {
        await upsertAllergenCategory(pool, record);
      }
      if (options.promoteRecords && record.record_type === 'allergen_alias') {
        await upsertAllergenAlias(pool, record);
      }
      if (options.promoteRecords && record.record_type === 'allergen_labeling_rule') {
        await upsertAllergenLabelingRule(pool, record);
      }
      if (options.promoteRecords && record.record_type === 'digital_label_rule') {
        await upsertDigitalLabelRule(pool, record);
      }
      if (options.promoteRecords && shouldPromoteRecord(record)) {
        await promotePendingReviewRecord(pool, record);
      }
    }
    if (options.promoteRecords) {
      await upsertAutomaticAllergenRelations(pool);
      await markAliasConflictsAmbiguous(pool);
    }
    await pool.query('commit');
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
}

async function upsertStagingRecords(pool: pg.Pool, records: StagingRecord[]) {
  for (const chunk of chunkArray(records, 100)) {
    const values: unknown[] = [];
    const placeholders = chunk.map((record, recordIndex) => {
      const offset = recordIndex * 17;
      values.push(
        record.id,
        record.source_id,
        record.source_tier,
        record.source_status,
        record.record_type,
        record.canonical_name,
        record.normalized_name,
        record.ingredient_type,
        record.page_number,
        record.table_name || null,
        record.row_reference || null,
        record.raw_source_text,
        JSON.stringify(record.parsed_data),
        record.parse_status,
        record.review_status,
        record.confidence_score,
        record.content_hash
      );
      return `(${Array.from({ length: 17 }, (_, index) => `$${offset + index + 1}`).join(',')})`;
    });
    await pool.query(
      `insert into ingredient_import_staging (
        id, source_id, source_tier, source_status, record_type, canonical_name, normalized_name,
        ingredient_type, page_number, table_name, row_reference, raw_source_text, parsed_data,
        parse_status, review_status, confidence_score, content_hash
      ) values ${placeholders.join(',')}
      on conflict (source_id, record_type, normalized_name, row_reference) do update set
        canonical_name = excluded.canonical_name,
        page_number = excluded.page_number,
        table_name = excluded.table_name,
        raw_source_text = excluded.raw_source_text,
        parsed_data = excluded.parsed_data,
        parse_status = excluded.parse_status,
        review_status = excluded.review_status,
        confidence_score = excluded.confidence_score,
        content_hash = excluded.content_hash,
        updated_at = now()`,
      values
    );
  }
}

async function upsertOfficialSource(pool: pg.Pool, source: SourceManifestItem) {
  await pool.query(
    `insert into official_sources (
      id, source_tier, source_status, source_org, source_type, standard_no, announcement_no,
      title, source_url, official_page_url, attachment_url, original_source_url, local_file_path,
      publication_date, effective_date, expiry_date, retrieved_at, content_hash, source_version,
      license, parser_version, verification_status, confidence_score, supersedes_source_id,
      superseded_by_source_id, notes, status
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,'active'
    )
    on conflict (id) do update set
      source_tier = excluded.source_tier,
      source_status = excluded.source_status,
      source_org = excluded.source_org,
      source_type = excluded.source_type,
      standard_no = excluded.standard_no,
      announcement_no = excluded.announcement_no,
      title = excluded.title,
      source_url = excluded.source_url,
      official_page_url = excluded.official_page_url,
      attachment_url = excluded.attachment_url,
      original_source_url = excluded.original_source_url,
      local_file_path = excluded.local_file_path,
      publication_date = excluded.publication_date,
      effective_date = excluded.effective_date,
      expiry_date = excluded.expiry_date,
      retrieved_at = excluded.retrieved_at,
      content_hash = excluded.content_hash,
      source_version = excluded.source_version,
      license = excluded.license,
      parser_version = excluded.parser_version,
      verification_status = excluded.verification_status,
      confidence_score = excluded.confidence_score,
      supersedes_source_id = excluded.supersedes_source_id,
      superseded_by_source_id = excluded.superseded_by_source_id,
      notes = excluded.notes,
      updated_at = now()`,
    [
      source.source_id,
      source.source_tier,
      source.source_status,
      source.source_org,
      source.source_type,
      source.standard_no || null,
      source.announcement_no || null,
      source.title,
      source.official_page_url || source.original_source_url || source.attachment_url || 'local-source-material',
      source.official_page_url || null,
      source.attachment_url || null,
      source.original_source_url || null,
      source.local_file_path,
      source.publication_date || 'unknown',
      source.effective_date || null,
      source.expiry_date || null,
      source.retrieved_at,
      source.sha256,
      source.source_version || null,
      source.license,
      source.parser_version,
      source.verification_status,
      source.confidence_score,
      source.supersedes_source_id || null,
      source.superseded_by_source_id || null,
      source.notes
    ]
  );
}

function shouldPromoteRecord(record: StagingRecord) {
  return ![
    'label_rule_',
    'nutrition_label_rule_',
    'nutrition_reference_value',
    'nutrition_content_claim_rule',
    'nutrition_comparative_claim_rule',
    'nutrition_polyol_energy_rule',
    'allergen_category',
    'allergen_alias',
    'allergen_labeling_rule',
    'digital_label_rule',
    'official_qa_',
    'official_notice_'
  ].some((prefix) => record.record_type.startsWith(prefix));
}

async function promotePendingReviewRecord(pool: pg.Pool, record: StagingRecord) {
  const master = await pool.query(
    `insert into ingredient_master (
      id, canonical_name, normalized_name, ingredient_type, regulatory_status, description,
      cns_code, ins_code, cas_number, source_status, legacy_ingredient_id, legacy_kind,
      enabled, valid_from, valid_to
    ) values ($1,$2,$3,$4,'pending_review',$5,null,null,null,'pending_review',null,null,true,$6,null)
    on conflict (normalized_name, ingredient_type) do update set
      regulatory_status = case
        when ingredient_master.regulatory_status = 'verified_regulation' then ingredient_master.regulatory_status
        else excluded.regulatory_status
      end,
      source_status = case
        when ingredient_master.source_status = 'official' then ingredient_master.source_status
        else excluded.source_status
      end,
      updated_at = now()
    returning id`,
    [
      `ik-${record.ingredient_type}-${hashText(`${record.ingredient_type}|${record.normalized_name}`).slice(0, 18)}`,
      record.canonical_name,
      record.normalized_name,
      record.ingredient_type,
      `${record.table_name || record.record_type} pending_review official-source extract.`,
      String(record.parsed_data.validFrom || '')
    ]
  );
  const ingredientId = String(master.rows[0].id);
  await upsertOfficialAlias(pool, ingredientId, record.canonical_name, 'canonical_name', record.source_id, record.confidence_score);
  await upsertSourceRelation(pool, ingredientId, record);

  if (record.record_type === 'nutrition_fortifier_rule') {
    await upsertNutrientAndFortifierRule(pool, ingredientId, record);
  }
  if (record.record_type === 'food_microorganism') {
    await upsertMicroorganismStrain(pool, ingredientId, record);
  }
  if (record.record_type === 'novel_food_ingredient') {
    await upsertNovelFoodRule(pool, ingredientId, record);
  }
  if (record.record_type === 'food_medicine_substance') {
    await upsertFoodMedicineRule(pool, ingredientId, record);
  }

  for (const alias of readStringList(record.parsed_data.aliases)) {
    await upsertOfficialAlias(pool, ingredientId, alias, 'official_alias', record.source_id, record.confidence_score);
  }
  for (const latin of readStringList(record.parsed_data.latinNames)) {
    await upsertOfficialAlias(pool, ingredientId, latin, 'latin_name', record.source_id, record.confidence_score);
  }
  for (const previous of readStringList(record.parsed_data.previousNames)) {
    await upsertOfficialAlias(pool, ingredientId, previous, 'previous_name', record.source_id, record.confidence_score);
  }
}

async function upsertNutritionReferenceValue(pool: pg.Pool, record: StagingRecord) {
  const nutrientId = await upsertNutrient(pool, record.canonical_name, record.normalized_name, record.source_id);
  await pool.query(
    `insert into nutrition_reference_values (
      id, nutrient_id, source_id, value, unit, population_scope, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,null,'pending_review')
    on conflict (nutrient_id, source_id, population_scope, valid_from) do update set
      value = excluded.value,
      unit = excluded.unit,
      status = excluded.status`,
    [
      `nutrition-nrv-${hashText(record.id).slice(0, 18)}`,
      nutrientId,
      record.source_id,
      String(record.parsed_data.value || ''),
      String(record.parsed_data.unit || ''),
      String(record.parsed_data.populationScope || '36月龄以上人群'),
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertNutritionClaimRule(pool: pg.Pool, record: StagingRecord) {
  const nutrientId = await upsertNutrient(pool, record.canonical_name, record.normalized_name, record.source_id);
  await pool.query(
    `insert into nutrition_claim_rules (
      id, nutrient_id, source_id, claim_type, comparison_operator, threshold_value,
      threshold_unit, basis_type, additional_conditions, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,null,'pending_review')
    on conflict (nutrient_id, source_id, claim_type, basis_type, threshold_value) do update set
      comparison_operator = excluded.comparison_operator,
      threshold_unit = excluded.threshold_unit,
      additional_conditions = excluded.additional_conditions,
      status = excluded.status`,
    [
      `nutrition-claim-${hashText(record.id).slice(0, 18)}`,
      nutrientId,
      record.source_id,
      String(record.parsed_data.claimType || record.record_type),
      String(record.parsed_data.comparisonOperator || ''),
      String(record.parsed_data.thresholdValue || ''),
      String(record.parsed_data.thresholdUnit || ''),
      String(record.parsed_data.basisType || 'other'),
      String(record.parsed_data.additionalConditions || ''),
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertNutritionPolyolEnergyRule(pool: pg.Pool, record: StagingRecord) {
  await pool.query(
    `insert into nutrition_polyol_energy_rules (
      id, source_id, polyol_name, normalized_name, energy_factor_kj_per_g,
      include_in_energy_calculation, carbohydrate_energy_adjustment, section_title,
      source_file, source_url, raw_text, evidence_summary, confidence, review_status,
      valid_from, valid_to
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review',$14,null)
    on conflict (source_id, normalized_name) do update set
      polyol_name = excluded.polyol_name,
      energy_factor_kj_per_g = excluded.energy_factor_kj_per_g,
      include_in_energy_calculation = excluded.include_in_energy_calculation,
      carbohydrate_energy_adjustment = excluded.carbohydrate_energy_adjustment,
      section_title = excluded.section_title,
      source_file = excluded.source_file,
      source_url = excluded.source_url,
      raw_text = excluded.raw_text,
      evidence_summary = excluded.evidence_summary,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      valid_from = excluded.valid_from,
      updated_at = now()`,
    [
      `polyol-energy-${hashText(record.id).slice(0, 18)}`,
      record.source_id,
      record.canonical_name,
      record.normalized_name,
      String(record.parsed_data.energyFactorKjPerG || ''),
      Boolean(record.parsed_data.includeInEnergyCalculation),
      String(record.parsed_data.carbohydrateEnergyAdjustment || ''),
      String(record.parsed_data.sectionTitle || record.table_name || ''),
      String(record.parsed_data.sourceFile || ''),
      String(record.parsed_data.sourceUrl || ''),
      record.raw_source_text,
      summarizeEvidence(record.raw_source_text),
      record.confidence_score,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertAllergenCategory(pool: pg.Pool, record: StagingRecord) {
  const code = String(record.parsed_data.code || record.normalized_name);
  await pool.query(
    `insert into allergen_categories (
      id, code, canonical_name, description, source_id, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,null,'pending_review')
    on conflict (code) do update set
      canonical_name = excluded.canonical_name,
      description = excluded.description,
      source_id = excluded.source_id,
      valid_from = excluded.valid_from,
      status = excluded.status,
      updated_at = now()`,
    [
      `allergen-category-${code}`,
      code,
      record.canonical_name,
      String(record.parsed_data.description || ''),
      record.source_id,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function ensureAllergenCategory(pool: pg.Pool, code: string, sourceId: string) {
  const definition = allergenDefinitions.find((item) => item.code === code);
  if (!definition) return `allergen-category-${code}`;
  await pool.query(
    `insert into allergen_categories (
      id, code, canonical_name, description, source_id, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,'2027-03-16',null,'pending_review')
    on conflict (code) do nothing`,
    [
      `allergen-category-${code}`,
      code,
      definition.name,
      definition.description,
      sourceId
    ]
  );
  return `allergen-category-${code}`;
}

async function upsertAllergenAlias(pool: pg.Pool, record: StagingRecord) {
  const categoryCode = String(record.parsed_data.categoryCode || '');
  const categoryId = await ensureAllergenCategory(pool, categoryCode, record.source_id);
  await pool.query(
    `insert into allergen_aliases (
      id, allergen_category_id, alias_name, normalized_alias, alias_type,
      source_id, evidence_summary, confidence, review_status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,'pending_review')
    on conflict (allergen_category_id, normalized_alias) do update set
      alias_name = excluded.alias_name,
      alias_type = excluded.alias_type,
      source_id = excluded.source_id,
      evidence_summary = excluded.evidence_summary,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      updated_at = now()`,
    [
      `allergen-alias-${hashText(`${categoryId}|${record.normalized_name}`).slice(0, 18)}`,
      categoryId,
      record.canonical_name,
      record.normalized_name,
      String(record.parsed_data.aliasType || 'example'),
      record.source_id,
      summarizeEvidence(record.raw_source_text),
      record.confidence_score
    ]
  );
}

async function upsertAllergenLabelingRule(pool: pg.Pool, record: StagingRecord) {
  const categoryCode = String(record.parsed_data.categoryCode || '');
  const categoryId = categoryCode ? await ensureAllergenCategory(pool, categoryCode, record.source_id) : null;
  await pool.query(
    `insert into allergen_labeling_rules (
      id, allergen_category_id, source_id, rule_type, title, section_title,
      page_number, source_file, source_url, raw_text, evidence_summary, confidence,
      review_status, valid_from, valid_to
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending_review',$13,null)
    on conflict (source_id, rule_type, title) do update set
      allergen_category_id = excluded.allergen_category_id,
      section_title = excluded.section_title,
      page_number = excluded.page_number,
      source_file = excluded.source_file,
      source_url = excluded.source_url,
      raw_text = excluded.raw_text,
      evidence_summary = excluded.evidence_summary,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      valid_from = excluded.valid_from,
      updated_at = now()`,
    [
      `allergen-label-rule-${hashText(record.id).slice(0, 18)}`,
      categoryId,
      record.source_id,
      String(record.parsed_data.ruleType || record.normalized_name),
      record.canonical_name,
      String(record.parsed_data.sectionTitle || record.table_name || ''),
      record.page_number,
      String(record.parsed_data.sourceFile || ''),
      String(record.parsed_data.sourceUrl || ''),
      record.raw_source_text,
      summarizeEvidence(record.raw_source_text),
      record.confidence_score,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertDigitalLabelRule(pool: pg.Pool, record: StagingRecord) {
  await pool.query(
    `insert into digital_label_rules (
      id, source_id, rule_type, title, section_title, page_number, source_file,
      source_url, raw_text, evidence_summary, confidence, review_status, valid_from, valid_to
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_review',$12,null)
    on conflict (source_id, rule_type) do update set
      title = excluded.title,
      section_title = excluded.section_title,
      page_number = excluded.page_number,
      source_file = excluded.source_file,
      source_url = excluded.source_url,
      raw_text = excluded.raw_text,
      evidence_summary = excluded.evidence_summary,
      confidence = excluded.confidence,
      review_status = excluded.review_status,
      valid_from = excluded.valid_from,
      updated_at = now()`,
    [
      `digital-label-rule-${hashText(record.id).slice(0, 18)}`,
      record.source_id,
      String(record.parsed_data.ruleType || record.normalized_name),
      record.canonical_name,
      String(record.parsed_data.sectionTitle || record.table_name || ''),
      record.page_number,
      String(record.parsed_data.sourceFile || ''),
      String(record.parsed_data.sourceUrl || ''),
      record.raw_source_text,
      summarizeEvidence(record.raw_source_text),
      record.confidence_score,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertAutomaticAllergenRelations(pool: pg.Pool) {
  const skippedAliases = new Set(['蛋白']);
  const aliases = await pool.query(
    `select aa.allergen_category_id, aa.normalized_alias, aa.alias_name, aa.source_id, aa.confidence
     from allergen_aliases aa
     where aa.review_status = 'pending_review'
     order by aa.normalized_alias`
  );
  for (const alias of aliases.rows as Array<{ allergen_category_id: string; normalized_alias: string; alias_name: string; source_id: string | null; confidence: string }>) {
    if (!alias.normalized_alias || skippedAliases.has(alias.normalized_alias)) continue;
    const matches = await pool.query(
      `select distinct m.id, m.canonical_name
       from ingredient_master m
       where m.normalized_name = $1
       union
       select distinct m.id, m.canonical_name
       from ingredient_aliases ia
       join ingredient_master m on m.id = ia.ingredient_id
       where ia.normalized_alias = $1
         and coalesce(ia.match_policy, 'normal') <> 'candidate_only'
       order by canonical_name
       limit 20`,
      [alias.normalized_alias]
    );
    for (const match of matches.rows as Array<{ id: string; canonical_name: string }>) {
      await pool.query(
        `insert into ingredient_allergen_relations (
          ingredient_id, allergen_category_id, relation_type, source_id, evidence_summary,
          confidence, review_status, valid_from, valid_to
        ) values ($1,$2,'possible',$3,$4,$5,'pending_review','2027-03-16',null)
        on conflict (ingredient_id, allergen_category_id, relation_type) do update set
          source_id = excluded.source_id,
          evidence_summary = excluded.evidence_summary,
          confidence = excluded.confidence,
          review_status = excluded.review_status,
          valid_from = excluded.valid_from`,
        [
          match.id,
          alias.allergen_category_id,
          alias.source_id,
          `自动 exact normalized match: allergen alias "${alias.alias_name}" -> ingredient "${match.canonical_name}". Requires manual review before verified use.`,
          confidenceForAllergenRelation(alias.normalized_alias, alias.confidence)
        ]
      );
    }
  }
}

async function markAliasConflictsAmbiguous(pool: pg.Pool) {
  await pool.query(
    `with conflicts as (
       select normalized_alias
       from ingredient_aliases
       group by normalized_alias
       having count(distinct ingredient_id) > 1
     )
     update ingredient_aliases ia
     set alias_confidence = 'ambiguous',
         match_policy = 'candidate_only',
         updated_at = now()
     from conflicts c
     where ia.normalized_alias = c.normalized_alias`
  );
}

function confidenceForAllergenRelation(normalizedAlias: string, sourceConfidence: string) {
  if (['鱼', '虾', '蟹', '小麦', '花生', '大豆', '黄豆', '牛奶', '乳糖', '核桃', '杏仁'].includes(normalizedAlias)) {
    return '0.78';
  }
  const parsed = Number(sourceConfidence);
  return Number.isFinite(parsed) ? String(Math.min(parsed, 0.72)) : '0.68';
}

async function upsertNutrient(pool: pg.Pool, canonicalName: string, normalizedName: string, sourceId: string) {
  const nutrientId = `nutrient-${hashText(normalizedName).slice(0, 18)}`;
  await pool.query(
    `insert into nutrients (id, canonical_name, normalized_name, standard_unit, nutrient_type)
     values ($1,$2,$3,null,'other')
     on conflict (normalized_name) do update set canonical_name = excluded.canonical_name, updated_at = now()`,
    [nutrientId, canonicalName, normalizedName]
  );
  await pool.query(
    `insert into nutrition_aliases (id, nutrient_id, alias_name, normalized_alias, source_id, is_official)
     values ($1,$2,$3,$4,$5,true)
     on conflict (nutrient_id, normalized_alias) do update set source_id = excluded.source_id, is_official = true`,
    [`nutrition-alias-${hashText(`${nutrientId}|${normalizedName}`).slice(0, 18)}`, nutrientId, canonicalName, normalizedName, sourceId]
  );
  return nutrientId;
}

async function upsertOfficialAlias(pool: pg.Pool, ingredientId: string, aliasName: string, aliasType: string, sourceId: string, confidenceScore: string) {
  const normalized = normalizeName(aliasName);
  if (!normalized) return;
  await pool.query(
    `insert into ingredient_aliases (
      id, ingredient_id, alias_name, normalized_alias, alias_type, language, source_id, source_status, is_official, confidence_score
    ) values ($1,$2,$3,$4,$5,$6,$7,'official',true,$8)
    on conflict (ingredient_id, normalized_alias, alias_type) do update set
      alias_name = excluded.alias_name,
      source_id = excluded.source_id,
      is_official = true,
      confidence_score = excluded.confidence_score,
      updated_at = now()`,
    [
      `ik-alias-${hashText(`${ingredientId}|${normalized}|${aliasType}`).slice(0, 20)}`,
      ingredientId,
      aliasName,
      normalized,
      aliasType,
      getAliasLanguage(aliasName),
      sourceId,
      confidenceScore
    ]
  );
}

async function upsertSourceRelation(pool: pg.Pool, ingredientId: string, record: StagingRecord) {
  await pool.query(
    `insert into ingredient_source_relations (
      ingredient_id, source_id, source_location, page_number, table_name, row_reference,
      original_name, evidence_summary, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,'pending_review')
    on conflict (ingredient_id, source_id, source_location, original_name) do update set
      page_number = excluded.page_number,
      table_name = excluded.table_name,
      row_reference = excluded.row_reference,
      evidence_summary = excluded.evidence_summary,
      valid_from = excluded.valid_from,
      status = excluded.status`,
    [
      ingredientId,
      record.source_id,
      record.id,
      record.page_number,
      record.table_name || null,
      record.row_reference || null,
      record.canonical_name,
      summarizeEvidence(record.raw_source_text),
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertNutrientAndFortifierRule(pool: pg.Pool, ingredientId: string, record: StagingRecord) {
  const nutrientId = `nutrient-${hashText(record.normalized_name).slice(0, 18)}`;
  await pool.query(
    `insert into nutrients (id, canonical_name, normalized_name, standard_unit, nutrient_type)
     values ($1,$2,$3,$4,'fortifier')
     on conflict (normalized_name) do update set canonical_name = excluded.canonical_name, updated_at = now()`,
    [nutrientId, record.canonical_name, record.normalized_name, String(record.parsed_data.unit || '') || null]
  );
  await pool.query(
    `insert into nutrition_aliases (id, nutrient_id, alias_name, normalized_alias, source_id, is_official)
     values ($1,$2,$3,$4,$5,true)
     on conflict (nutrient_id, normalized_alias) do update set source_id = excluded.source_id, is_official = true`,
    [`nutrition-alias-${hashText(`${nutrientId}|${record.normalized_name}`).slice(0, 18)}`, nutrientId, record.canonical_name, record.normalized_name, record.source_id]
  );
  await pool.query(
    `insert into nutrition_fortifier_rules (
      id, ingredient_id, nutrient_id, source_id, compound_name, food_category_code,
      food_category_name, min_use_level, max_use_level, unit, restrictions, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,null,'pending_review')
    on conflict (source_id, ingredient_id, food_category_code, food_category_name, max_use_level) do update set
      min_use_level = excluded.min_use_level,
      unit = excluded.unit,
      restrictions = excluded.restrictions,
      status = excluded.status`,
    [
      `nutrition-fortifier-rule-${hashText(record.id).slice(0, 18)}`,
      ingredientId,
      nutrientId,
      record.source_id,
      String(record.parsed_data.compoundName || '') || null,
      String(record.parsed_data.foodCategoryCode || ''),
      String(record.parsed_data.foodCategoryName || ''),
      String(record.parsed_data.minUseLevel || '') || null,
      String(record.parsed_data.maxUseLevel || '') || null,
      String(record.parsed_data.unit || '') || null,
      String(record.parsed_data.restrictions || '') || null,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertMicroorganismStrain(pool: pg.Pool, ingredientId: string, record: StagingRecord) {
  const strainCode = String(record.parsed_data.strainCode || record.parsed_data.strain || '');
  await pool.query(
    `insert into microorganism_strains (
      id, ingredient_id, strain_code, permitted_for_general_food, permitted_for_infant_food,
      age_restrictions, usage_restrictions, source_id, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,'pending_review')
    on conflict (id) do update set
      strain_code = excluded.strain_code,
      permitted_for_general_food = excluded.permitted_for_general_food,
      permitted_for_infant_food = excluded.permitted_for_infant_food,
      age_restrictions = excluded.age_restrictions,
      usage_restrictions = excluded.usage_restrictions,
      source_id = excluded.source_id,
      valid_from = excluded.valid_from,
      status = excluded.status`,
    [
      `microorganism-strain-${hashText(record.id).slice(0, 18)}`,
      ingredientId,
      strainCode,
      Boolean(record.parsed_data.permittedForGeneralFood),
      Boolean(record.parsed_data.permittedForInfantFood),
      String(record.parsed_data.ageRestrictions || '') || null,
      String(record.parsed_data.usageRestrictions || '') || null,
      record.source_id,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertNovelFoodRule(pool: pg.Pool, ingredientId: string, record: StagingRecord) {
  await pool.query(
    `insert into novel_food_ingredient_rules (
      id, ingredient_id, source_id, source_species, edible_part, production_process,
      recommended_daily_intake, intake_unit, unsuitable_populations, label_requirements,
      quality_requirements, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,null,'pending_review')
    on conflict (ingredient_id, source_id) do update set
      quality_requirements = excluded.quality_requirements,
      status = excluded.status`,
    [
      `novel-food-rule-${hashText(record.id).slice(0, 18)}`,
      ingredientId,
      record.source_id,
      String(record.parsed_data.sourceSpecies || '') || null,
      String(record.parsed_data.ediblePart || '') || null,
      String(record.parsed_data.productionProcess || '') || null,
      String(record.parsed_data.recommendedDailyIntake || '') || null,
      String(record.parsed_data.intakeUnit || '') || null,
      String(record.parsed_data.unsuitablePopulations || '') || null,
      String(record.parsed_data.labelRequirements || '') || null,
      String(record.parsed_data.qualityRequirements || '') || null,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function upsertFoodMedicineRule(pool: pg.Pool, ingredientId: string, record: StagingRecord) {
  await pool.query(
    `insert into food_medicine_rules (
      id, ingredient_id, source_id, botanical_name, latin_name, family_name,
      edible_part, permitted_use, usage_restrictions, valid_from, valid_to, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,null,'pending_review')
    on conflict (ingredient_id, source_id) do update set
      botanical_name = excluded.botanical_name,
      latin_name = excluded.latin_name,
      family_name = excluded.family_name,
      edible_part = excluded.edible_part,
      usage_restrictions = excluded.usage_restrictions,
      status = excluded.status`,
    [
      `food-medicine-rule-${hashText(record.id).slice(0, 18)}`,
      ingredientId,
      record.source_id,
      String(record.parsed_data.botanicalName || '') || null,
      readStringList(record.parsed_data.latinNames).join('；') || null,
      String(record.parsed_data.familyName || '') || null,
      String(record.parsed_data.ediblePart || '') || null,
      String(record.parsed_data.permittedUse || '按照传统既是食品又是中药材的物质目录') || null,
      String(record.parsed_data.usageRestrictions || '') || null,
      String(record.parsed_data.validFrom || '')
    ]
  );
}

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(fullPath));
      continue;
    }
    if (supportedExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function buildSourceManifestItem(filePath: string): Promise<SourceManifestItem> {
  const paths = getPipelinePaths();
  const relativePath = normalizePath(relative(paths.root, filePath));
  const bytes = await readFile(filePath);
  const info = await stat(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const meta = resolveKnownSource(relativePath);
  const title = meta?.title || basename(filePath);
  return {
    source_id: `official-source-${meta?.slug || slugify(basename(filePath, extname(filePath)))}-${sha256.slice(0, 12)}`,
    source_tier: meta?.source_tier || 'S0',
    source_status: meta?.source_status || 'pending_review',
    source_type: meta?.source_type || 'official_document',
    title,
    standard_no: meta?.standard_no || '',
    announcement_no: meta?.announcement_no || '',
    source_org: meta?.source_org || '待核验官方来源',
    official_page_url: meta?.official_page_url || '',
    attachment_url: meta?.attachment_url || '',
    original_source_url: meta?.original_source_url || meta?.official_page_url || '',
    local_file_path: relativePath,
    file_type: extname(filePath).slice(1).toLowerCase(),
    file_size: info.size,
    sha256,
    publication_date: meta?.publication_date || '',
    effective_date: meta?.effective_date || '',
    expiry_date: '',
    retrieved_at: new Date().toISOString(),
    source_version: meta?.source_version || meta?.standard_no || '',
    license: meta?.license || 'government_public_document',
    parser_name: parserName,
    parser_version: parserVersion,
    parse_status: 'inventory_only',
    verification_status: meta?.verification_status || 'verified_by_local_content_and_checksum',
    confidence_score: meta?.confidence_score || '0.80',
    supersedes_source_id: '',
    superseded_by_source_id: '',
    notes: meta?.notes || ''
  };
}

function resolveKnownSource(relativePath: string) {
  return knownSources.find((source) => relativePath.includes(source.match));
}

function findDuplicateSources(sources: SourceManifestItem[]) {
  const byHash = new Map<string, string[]>();
  for (const source of sources) {
    byHash.set(source.sha256, [...(byHash.get(source.sha256) || []), source.local_file_path]);
  }
  return [...byHash.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths }));
}

async function extractSourceText(source: SourceManifestItem) {
  const paths = getPipelinePaths();
  const inputPath = join(paths.root, source.local_file_path);
  const outputPath = join(paths.extractedDir, `${source.source_id}.txt`);
  if (source.file_type !== 'pdf') {
    const text = await readFile(inputPath, 'utf8');
    await writeFile(outputPath, text);
    return text;
  }
  let stdout = '';
  try {
    const result = await execFileAsync('pdftotext', ['-layout', inputPath, '-'], {
      maxBuffer: 1024 * 1024 * 80
    });
    stdout = result.stdout;
  } catch (error) {
    const cachedText = await readCachedExtractedText(outputPath);
    if (cachedText) return cachedText;
    throw error;
  }
  const ocrText = stdout.trim() ? '' : await readInfantMicroorganismOcrText(source);
  const cachedText = stdout.trim() || ocrText.trim() ? '' : await readCachedExtractedText(outputPath);
  const fallbackText = stdout.trim()
    ? stdout
    : ocrText || cachedText;
  await writeFile(outputPath, fallbackText);
  return fallbackText;
}

async function readCachedExtractedText(outputPath: string) {
  try {
    const text = await readFile(outputPath, 'utf8');
    return text.trim() ? text : '';
  } catch {
    return '';
  }
}

async function readInfantMicroorganismOcrText(source: SourceManifestItem) {
  if (!source.local_file_path.includes('可用于婴幼儿食品的菌种名单')) return '';
  const paths = getPipelinePaths();
  const ocrFiles = [
    join(paths.rawDir, 'infant-microorganism-page-1-ocr.json'),
    join(paths.rawDir, 'infant-microorganism-page-2-ocr.json')
  ];
  const pages: string[] = [];
  for (const filePath of ocrFiles) {
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8')) as { rawText?: unknown };
      const rawText = typeof parsed.rawText === 'string' ? parsed.rawText.trim() : '';
      if (rawText) pages.push(rawText);
    } catch {
      return '';
    }
  }
  return pages.join('\n\f\n');
}

function parseSourceRecords(source: SourceManifestItem, text: string): StagingRecord[] {
  if (source.standard_no === 'GB 14880-2012') return parseGb14880(source, text);
  if (source.source_type === 'official_qa') return parseOfficialQaRules(source, text);
  if (source.source_type === 'official_notice') return parseOfficialNoticeRules(source, text);
  if (source.standard_no.startsWith('GB 7718-')) return parseGb7718LabelRules(source, text);
  if (source.standard_no.startsWith('GB 28050-')) return parseGb28050NutritionRules(source, text);
  if (source.local_file_path.includes('三新食品')) return parseSanxinCatalog(source, text);
  if (source.local_file_path.includes('食药物质')) return parseFoodMedicineCatalog(source, text);
  if (source.local_file_path.includes('可用于食品的菌种名单')) return parseMicroorganismCatalog(source, text, false);
  if (source.local_file_path.includes('可用于婴幼儿食品的菌种名单')) return parseMicroorganismCatalog(source, text, true);
  return [];
}

function parseGb14880(source: SourceManifestItem, text: string): StagingRecord[] {
  const records: StagingRecord[] = [];
  let current = '';
  for (const [pageIndex, pageText] of splitPages(text).entries()) {
    for (const rawLine of pageText.split('\n')) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      if (!line || line.includes('食品分类号') || line.includes('GB 14880')) continue;
      const match = line.match(/^(?:(?<name>[\u4e00-\u9fa5A-Za-z0-9βγ\-（）()]+)\s+)?(?<code>\d{2}(?:\.\d{1,2})+)\s+(?<food>.+?)\s+(?<level>(?:≤\s*)?\d+(?:\.\d+)?\s*(?:mg|μg|g|％|%)\/kg(?:\s*~\s*\d+(?:\.\d+)?\s*(?:mg|μg|g|％|%)\/kg)?|≤\s*\d+(?:\.\d+)?\s*(?:g|mg|μg)\/kg|≤\s*\d+(?:\.\d+)?％.*)$/u);
      if (match?.groups?.name && isLikelyNutrientName(match.groups.name)) {
        current = normalizeNutrientName(match.groups.name);
      }
      if (match?.groups && current && !/(?:mg|μg|g)\/kg/u.test(match.groups.food)) {
        const level = normalizeSpaces(match.groups.level);
        const parsedLevel = parseUseLevel(level);
        records.push(buildStagingRecord(source, {
          recordType: 'nutrition_fortifier_rule',
          canonicalName: current,
          ingredientType: 'nutrition_fortifier',
          pageNumber: pageIndex + 1,
          tableName: '表 A.1',
          rowReference: `GB14880-A1-${records.length + 1}`,
          rawSourceText: line,
          confidenceScore: '0.82',
          parsedData: {
            foodCategoryCode: match.groups.code,
            foodCategoryName: normalizeSpaces(match.groups.food),
            minUseLevel: parsedLevel.min,
            maxUseLevel: parsedLevel.max,
            unit: parsedLevel.unit,
            validFrom: source.effective_date
          }
        }));
        continue;
      }
      const nutrientOnly = line.match(/^([\u4e00-\u9fa5A-Za-z0-9βγ\-（）()]{1,20})$/u);
      if (nutrientOnly && isLikelyNutrientName(nutrientOnly[1])) current = normalizeNutrientName(nutrientOnly[1]);
    }
  }
  return records;
}

function parseSanxinCatalog(source: SourceManifestItem, text: string): StagingRecord[] {
  const records: StagingRecord[] = [];
  let section: 'novel_food_ingredient' | 'food_additive_new_variety' | 'nutrition_fortifier_new_variety' | 'food_microorganism' | 'skip' = 'novel_food_ingredient';
  for (const [pageIndex, pageText] of splitPages(text).entries()) {
    for (const rawLine of pageText.split('\n')) {
      const raw = rawLine.trimEnd();
      const line = normalizeSpaces(rawLine);
      if (line.includes('一、新食品原料')) section = 'novel_food_ingredient';
      if (line.includes('食品添加剂新品种') || /^二、食品添加剂/u.test(line)) section = 'food_additive_new_variety';
      if (line.includes('营养强化剂新品种')) section = 'nutrition_fortifier_new_variety';
      if (line.includes('食品用菌种')) section = 'food_microorganism';
      if (line.includes('食品相关产品')) section = 'skip';
      if (section === 'skip') continue;
      const columns = raw.split(/\s{2,}/u).map((item) => item.trim()).filter(Boolean);
      if (columns.length < 2 || !/20\d{2}\s*年第\s*\d+\s*号/u.test(columns[0])) continue;
      const name = cleanupCatalogName(columns[1]);
      if (!isValidCatalogName(name)) continue;
      const recordType = section === 'food_microorganism' ? 'food_microorganism' : section;
      const ingredientType = section === 'novel_food_ingredient'
        ? 'novel_food_ingredient'
        : section === 'nutrition_fortifier_new_variety'
          ? 'nutrition_fortifier'
          : section === 'food_microorganism'
            ? 'food_microorganism'
            : 'food_additive';
      records.push(buildStagingRecord(source, {
        recordType,
        canonicalName: name,
        ingredientType,
        pageNumber: pageIndex + 1,
        tableName: '三新食品汇总目录',
        rowReference: `${columns[0]}:${name}`,
        rawSourceText: line,
        confidenceScore: section === 'novel_food_ingredient' ? '0.84' : '0.78',
        parsedData: {
          announcementNo: columns[0],
          qualityRequirements: columns.slice(2).join(' '),
          validFrom: ''
        }
      }));
    }
  }
  return records;
}

function parseFoodMedicineCatalog(source: SourceManifestItem, text: string): StagingRecord[] {
  const rows = source.local_file_path.includes('党参')
    ? foodMedicineNineRows
    : source.local_file_path.includes('地黄')
      ? foodMedicineFourRows
      : [];
  return rows
    .filter((row) => text.includes(row.name))
    .map((row, index) => buildStagingRecord(source, {
      recordType: 'food_medicine_substance',
      canonicalName: row.name,
      ingredientType: 'food_medicine_substance',
      pageNumber: null,
      tableName: '按照传统既是食品又是中药材的物质目录',
      rowReference: `${source.source_id}:${index + 1}`,
      rawSourceText: findEvidenceLine(text, row.name),
      confidenceScore: '0.86',
      parsedData: {
        botanicalName: row.botanicalName,
        latinNames: row.latinNames,
        familyName: row.familyName,
        ediblePart: row.ediblePart,
        usageRestrictions: row.usageRestrictions,
        permittedUse: '按照传统既是食品又是中药材的物质目录'
      }
    }));
}

function parseMicroorganismCatalog(source: SourceManifestItem, text: string, infant: boolean): StagingRecord[] {
  if (infant) return parseInfantMicroorganismCatalog(source, text);
  const records: StagingRecord[] = [];
  for (const [pageIndex, pageText] of splitPages(text).entries()) {
    for (const rawLine of pageText.split('\n')) {
      const line = normalizeSpaces(rawLine);
      const match = line.match(/^\d+\s+([\u4e00-\u9fa5（）()A-Za-z0-9\-]+)\s+([A-Z][A-Za-z]+(?:\s+[a-z]+)(?:\s+subsp\.\s+[a-z]+)?(?:\s+biovar\s+[a-z]+)?)/u);
      if (!match) continue;
      const canonicalName = match[1].trim();
      if (canonicalName.endsWith('属') || canonicalName.length < 2) continue;
      records.push(buildStagingRecord(source, {
        recordType: 'food_microorganism',
        canonicalName,
        ingredientType: 'food_microorganism',
        pageNumber: pageIndex + 1,
        tableName: source.title,
        rowReference: `${source.source_id}:${records.length + 1}`,
        rawSourceText: line,
        confidenceScore: infant ? '0.80' : '0.86',
        parsedData: {
          latinNames: [match[2].trim()],
          permittedForGeneralFood: !infant,
          permittedForInfantFood: infant,
          ageRestrictions: infant ? '婴幼儿食品适用范围待人工复核' : '',
          usageRestrictions: '名单以外的新菌种按新食品原料安全性审查管理办法执行'
        }
      }));
    }
  }
  return records;
}

function parseInfantMicroorganismCatalog(source: SourceManifestItem, text: string): StagingRecord[] {
  return infantMicroorganismRows
    .filter((row) => text.includes(row.updatedName) || text.includes(row.previousName) || text.includes(row.strain))
    .map((row, index) => buildStagingRecord(source, {
      recordType: 'food_microorganism',
      canonicalName: `${row.updatedName}${row.strain}`,
      ingredientType: 'food_microorganism',
      pageNumber: index < 8 ? 1 : 2,
      tableName: '可用于婴幼儿食品的菌种名单',
      rowReference: `${source.source_id}:infant:${row.no}`,
      rawSourceText: `${row.no} ${row.updatedName}${row.strain} ${row.updatedLatinName}；原用菌种名称：${row.previousName}${row.strain} ${row.previousLatinName}`,
      confidenceScore: '0.78',
      parsedData: {
        strain: row.strain,
        latinNames: [row.updatedLatinName],
        strainCode: row.strain,
        previousNames: [`${row.previousName}${row.strain}`],
        previousLatinNames: [row.previousLatinName],
        permittedForGeneralFood: false,
        permittedForInfantFood: true,
        ageRestrictions: row.ageRestrictions,
        verificationMethod: 'official scanned PDF OCR assisted extraction; pending manual review',
        ocrEvidenceFiles: [
          'data/official_sources/raw/infant-microorganism-page-1-ocr.json',
          'data/official_sources/raw/infant-microorganism-page-2-ocr.json'
        ],
        usageRestrictions: '名单以外的新菌种按新食品原料安全性审查管理办法执行'
      }
    }));
}

function parseGb7718LabelRules(source: SourceManifestItem, text: string): StagingRecord[] {
  const ruleDefinitions = [
    {
      recordType: 'label_rule_ingredient_list',
      title: '配料表规则',
      terms: ['预包装食品(包括单一配料食品)', '预包装食品的标签上应标示配料表'],
      category: 'ingredient_list'
    },
    {
      recordType: 'label_rule_additive_labeling',
      title: '食品添加剂标示规则',
      terms: ['食品添加剂应当标示', '食品添加剂应当标示其在 GB 2760'],
      category: 'food_additive_labeling'
    },
    {
      recordType: 'label_rule_compound_ingredient',
      title: '复合配料规则',
      terms: ['复合配料', '由两种或两种以上的其他配料'],
      category: 'compound_ingredient'
    },
    {
      recordType: 'label_rule_allergen_labeling',
      title: '致敏物质标示规则',
      terms: ['以下食品配料可能导致敏', '以下食品及其制品可能导致过敏反应'],
      category: 'allergen_labeling'
    },
    {
      recordType: 'label_rule_claim',
      title: '食品声称规则',
      terms: ['食品声称应能真实', '特别强调添加或含有'],
      category: 'food_claim'
    },
    {
      recordType: 'label_rule_date_shelf_life_storage',
      title: '日期、保质期、贮存条件规则',
      terms: ['日期标示应清晰醒目', '应清晰标示预包装食品的生产日期和保质期', '预包装食品标签上应标示贮存条件'],
      category: 'date_shelf_life_storage'
    },
    {
      recordType: 'label_rule_imported_food',
      title: '进口食品中文标签规则',
      terms: ['进口预包装食品标签需有', '进口预包装食品应标示原产国'],
      category: 'imported_food_label'
    },
    {
      recordType: 'label_rule_digital_label',
      title: '数字标签规则',
      terms: ['数字标签展示的内容应符合法律', '食品包装上采用二维码等信息化手段展示'],
      category: 'digital_label'
    },
    {
      recordType: 'label_rule_labeling_exemption',
      title: '豁免标示规则',
      terms: ['豁免标示内容', '标示内容的豁免'],
      category: 'labeling_exemption'
    }
  ];

  const records = ruleDefinitions.flatMap((definition) => {
    const evidence = findEvidenceExcerpt(text, definition.terms, { maxLines: 12 });
    if (!evidence) return [];
    return [buildRuleRecord(source, {
      recordType: definition.recordType,
      canonicalName: `${source.standard_no} ${definition.title}`,
      pageNumber: evidence.pageNumber,
      tableName: 'GB 7718 标签规则',
      rowReference: `${source.standard_no}-${definition.category}`,
      rawSourceText: evidence.text,
      confidenceScore: source.standard_no.endsWith('2025') ? '0.88' : '0.82',
      parsedData: {
        ruleCategory: definition.category,
        standardNo: source.standard_no,
        sourceType: source.source_type,
        validFrom: source.effective_date,
        reviewStatusReason: 'official PDF text excerpt parsed automatically; requires manual legal review before verified use'
      }
    })];
  });

  if (source.standard_no === 'GB 7718-2025') {
    records.push(...parseGb7718AllergenData(source, text));
    records.push(...parseGb7718DigitalLabelRules(source, text));
  }

  return records;
}

function parseGb28050NutritionRules(source: SourceManifestItem, text: string): StagingRecord[] {
  const records: StagingRecord[] = [];
  const ruleDefinitions = [
    {
      recordType: 'nutrition_label_rule_mandatory_nutrients',
      title: '强制标示营养成分规则',
      terms: ['预包装食品营养标签强制标示的内容包括'],
      category: 'mandatory_nutrients'
    },
    {
      recordType: 'nutrition_label_rule_energy_conversion',
      title: '能量换算系数规则',
      terms: ['供能成分的能量换算系数分别为'],
      category: 'energy_conversion'
    },
    {
      recordType: 'nutrition_label_rule_content_claim',
      title: '营养声称规则',
      terms: ['能量和营养成分含量声称的要求和限制性条件'],
      category: 'nutrition_content_claim'
    },
    {
      recordType: 'nutrition_label_rule_comparative_claim',
      title: '比较声称规则',
      terms: ['能量和营养成分比较声称的要求和条件'],
      category: 'nutrition_comparative_claim'
    },
    {
      recordType: 'nutrition_label_rule_exemption',
      title: '豁免强制标示规则',
      terms: ['豁免强制标示营养标签的预包装食品'],
      category: 'nutrition_label_exemption'
    }
  ];

  for (const definition of ruleDefinitions) {
    const evidence = findEvidenceExcerpt(text, definition.terms, { maxLines: 18 });
    if (!evidence) continue;
    records.push(buildRuleRecord(source, {
      recordType: definition.recordType,
      canonicalName: `${source.standard_no} ${definition.title}`,
      pageNumber: evidence.pageNumber,
      tableName: 'GB 28050 营养标签规则',
      rowReference: `${source.standard_no}-${definition.category}`,
      rawSourceText: evidence.text,
      confidenceScore: '0.86',
      parsedData: {
        ruleCategory: definition.category,
        standardNo: source.standard_no,
        sourceType: source.source_type,
        validFrom: source.effective_date,
        reviewStatusReason: 'official PDF text excerpt parsed automatically; requires manual legal review before verified use'
      }
    }));
  }

  if (source.standard_no === 'GB 28050-2025') {
    records.push(...parseGb28050NrvRows(source, text));
    records.push(...parseGb28050ContentClaimRows(source, text));
    records.push(...parseGb28050ComparativeClaimRows(source, text));
    records.push(...parseGb28050PolyolEnergyRules(source, text));
  }

  return records;
}

function parseGb7718AllergenData(
  source: SourceManifestItem,
  text: string,
  options: { htmlText?: boolean } = {}
): StagingRecord[] {
  const categoryEvidence = findEvidenceExcerpt(
    text,
    ['以下食品配料可能导致', '以下食品及其制品可能导致过敏反应', '含麸质谷物、甲壳纲类动物、鱼类、蛋类、花生、大豆、乳、坚果'],
    { maxLines: 22, htmlText: options.htmlText }
  );
  if (!categoryEvidence) return [];

  const appendixEvidence = findEvidenceExcerpt(
    text,
    ['致敏物质用作配料时', '在配料表中使用易辨识的名称和标示方式', '食物致(过)敏原'],
    { maxLines: 26, htmlText: options.htmlText }
  ) || categoryEvidence;
  const crossContactEvidence = findEvidenceExcerpt(
    text,
    ['加工过程中间接带入或可能带入的致敏物质', '生产加工过程中可能带入'],
    { maxLines: 12, htmlText: options.htmlText }
  ) || categoryEvidence;
  const voluntaryEvidence = findEvidenceExcerpt(
    text,
    ['上述配料以外的其他可能的致敏物质可自愿标示提示信息', '鼓励食品生产者对八大类致敏物质以外'],
    { maxLines: 8, htmlText: options.htmlText }
  ) || categoryEvidence;
  const sourceUrl = source.official_page_url || source.original_source_url || source.attachment_url;

  const records: StagingRecord[] = allergenDefinitions.map((definition) => buildStagingRecord(source, {
    recordType: 'allergen_category',
    canonicalName: definition.name,
    ingredientType: 'other',
    pageNumber: categoryEvidence.pageNumber,
    tableName: 'GB 7718 致敏物质',
    rowReference: `${source.source_id}-allergen-category-${definition.code}`,
    rawSourceText: categoryEvidence.text,
    confidenceScore: source.source_type === 'official_standard' ? '0.88' : '0.78',
    parsedData: {
      code: definition.code,
      description: definition.description,
      sectionTitle: '致敏物质',
      sourceFile: source.local_file_path,
      sourceUrl,
      validFrom: source.effective_date,
      reviewStatusReason: 'official GB 7718 allergen category parsed automatically; requires manual review before verified use'
    }
  }));

  for (const definition of allergenDefinitions) {
    for (const alias of definition.aliases) {
      const normalizedAlias = normalizeName(alias);
      const aliasEvidence = categoryEvidence.text.includes(alias) || appendixEvidence.text.includes(alias)
        ? [categoryEvidence.text, appendixEvidence.text].find((item) => item.includes(alias)) || categoryEvidence.text
        : categoryEvidence.text;
      records.push(buildStagingRecord(source, {
        recordType: 'allergen_alias',
        canonicalName: alias,
        ingredientType: 'other',
        pageNumber: categoryEvidence.pageNumber,
        tableName: 'GB 7718 致敏物质候选别名',
        rowReference: `${source.source_id}-allergen-alias-${definition.code}-${normalizedAlias}`,
        rawSourceText: aliasEvidence,
        confidenceScore: aliasEvidence.includes(alias) ? '0.76' : '0.62',
        parsedData: {
          categoryCode: definition.code,
          categoryName: definition.name,
          aliasType: aliasEvidence.includes(alias) ? 'official_example_or_verbatim' : 'candidate_from_category_scope',
          sectionTitle: '致敏物质',
          sourceFile: source.local_file_path,
          sourceUrl,
          validFrom: source.effective_date,
          verificationMethod: aliasEvidence.includes(alias)
            ? 'alias appears in official GB 7718 excerpt'
            : 'alias inferred as candidate example from official category scope; pending manual review'
        }
      }));
    }
  }

  const labelingRules = [
    {
      ruleType: 'direct_ingredient_required_labeling',
      title: '直接作为配料使用时的致敏物质标示要求',
      evidence: categoryEvidence
    },
    {
      ruleType: 'ingredient_list_emphasis',
      title: '配料表强调标示方式',
      evidence: appendixEvidence
    },
    {
      ruleType: 'nearby_prompt',
      title: '配料表临近位置提示方式',
      evidence: appendixEvidence
    },
    {
      ruleType: 'cross_contact_precautionary_prompt',
      title: '交叉污染预防性提示',
      evidence: crossContactEvidence
    },
    {
      ruleType: 'voluntary_other_allergen_prompt',
      title: '可自愿标示的其他致敏物质',
      evidence: voluntaryEvidence
    }
  ];

  for (const rule of labelingRules) {
    records.push(buildStagingRecord(source, {
      recordType: 'allergen_labeling_rule',
      canonicalName: rule.title,
      ingredientType: 'other',
      pageNumber: rule.evidence.pageNumber,
      tableName: 'GB 7718 致敏物质标示规则',
      rowReference: `${source.source_id}-allergen-labeling-${rule.ruleType}`,
      rawSourceText: rule.evidence.text,
      confidenceScore: source.source_type === 'official_standard' ? '0.82' : '0.74',
      parsedData: {
        ruleType: rule.ruleType,
        sectionTitle: '致敏物质',
        sourceFile: source.local_file_path,
        sourceUrl,
        validFrom: source.effective_date,
        reviewStatusReason: 'official GB 7718 allergen labeling excerpt parsed automatically; requires manual review before verified use'
      }
    }));
  }

  return records;
}

function parseGb7718DigitalLabelRules(
  source: SourceManifestItem,
  text: string,
  options: { htmlText?: boolean } = {}
): StagingRecord[] {
  const sourceUrl = source.official_page_url || source.original_source_url || source.attachment_url;
  const definitions = [
    {
      ruleType: 'definition',
      title: '数字标签定义',
      terms: ['食品包装上采用二维码等信息化手段展示的食品标签', '数字标签是食品包装上采用二维码等信息化手段展示的食品标签']
    },
    {
      ruleType: 'content_scope',
      title: '数字标签内容范围',
      terms: ['数字标签展示的内容应符合法律', '数字标签属于食品标签，通过数字标签标示的内容应符合本标准的规定']
    },
    {
      ruleType: 'identity_marking',
      title: '数字标签身份明示要求',
      terms: ['通过“数字标签”或类似字样明示其身份']
    },
    {
      ruleType: 'first_page_direct_display',
      title: '一级页面直接展示要求',
      terms: ['一级页面直接展示', '一级页面直接展示标签信息']
    },
    {
      ruleType: 'interference_elements',
      title: '不得有干扰阅读元素',
      terms: ['不应有影响正常阅读的干扰元素内容', '避免弹窗广告等干扰消费者阅读食品标签']
    },
    {
      ruleType: 'clear_readable_no_tamper',
      title: '清晰、醒目、易读和不得篡改要求',
      terms: ['数字标签标示内容应清晰、醒目、易于识读,不得篡改', '数字标签标示内容应清晰、醒目、易于识读']
    },
    {
      ruleType: 'simplified_package_labeling',
      title: '使用数字标签后包装标签简化规则',
      terms: ['可 以 按 照 相 关 规 定 简 化 预 包 装 食 品 包 装', '使用数字标签标示了应当在预包装食品上标注的事项可以简化']
    }
  ];

  return definitions.flatMap((definition) => {
    const evidence = findEvidenceExcerpt(text, definition.terms, { maxLines: 10, htmlText: options.htmlText });
    if (!evidence) return [];
    return [buildStagingRecord(source, {
      recordType: 'digital_label_rule',
      canonicalName: definition.title,
      ingredientType: 'other',
      pageNumber: evidence.pageNumber,
      tableName: '数字标签规则',
      rowReference: `${source.source_id}-digital-label-${definition.ruleType}`,
      rawSourceText: evidence.text,
      confidenceScore: source.source_type === 'official_notice' ? '0.88' : '0.76',
      parsedData: {
        ruleType: definition.ruleType,
        sectionTitle: source.source_type === 'official_notice' ? '预包装食品数字标签公告' : 'GB 7718 数字标签要求',
        sourceFile: source.local_file_path,
        sourceUrl,
        validFrom: source.effective_date,
        reviewStatusReason: 'official digital label excerpt parsed automatically; requires manual review before verified use'
      }
    })];
  });
}

function parseGb28050PolyolEnergyRules(source: SourceManifestItem, text: string): StagingRecord[] {
  const evidence = findEvidenceExcerpt(text, ['糖醇', '赤藓糖醇', '糖醇及其能量换算系数'], { maxLines: 18 });
  if (!evidence || !/糖醇/u.test(evidence.text)) return [];
  const sourceUrl = source.official_page_url || source.original_source_url || source.attachment_url;
  const sharedParsedData = {
    includeInEnergyCalculation: /标示糖醇名称和含量|纳入能量计算/u.test(evidence.text),
    carbohydrateEnergyAdjustment: /碳水化合物/u.test(evidence.text)
      ? '如纳入能量计算，碳水化合物能量计算时应结合官方原文相应扣除糖醇能量。'
      : '',
    sectionTitle: '糖醇及其能量换算系数',
    sourceFile: source.local_file_path,
    sourceUrl,
    validFrom: source.effective_date,
    sourceType: source.source_type,
    reviewStatusReason: 'official GB 28050 QA excerpt parsed automatically; requires manual review before verified use'
  };
  return [
    buildStagingRecord(source, {
      recordType: 'nutrition_polyol_energy_rule',
      canonicalName: '赤藓糖醇',
      ingredientType: 'other',
      pageNumber: evidence.pageNumber,
      tableName: '糖醇能量换算系数',
      rowReference: `${source.source_id}-polyol-energy-erythritol`,
      rawSourceText: evidence.text,
      confidenceScore: '0.82',
      parsedData: {
        ...sharedParsedData,
        energyFactorKjPerG: '0'
      }
    }),
    buildStagingRecord(source, {
      recordType: 'nutrition_polyol_energy_rule',
      canonicalName: '其他糖醇',
      ingredientType: 'other',
      pageNumber: evidence.pageNumber,
      tableName: '糖醇能量换算系数',
      rowReference: `${source.source_id}-polyol-energy-other-polyols`,
      rawSourceText: evidence.text,
      confidenceScore: '0.82',
      parsedData: {
        ...sharedParsedData,
        energyFactorKjPerG: '10'
      }
    })
  ];
}

function parseGb28050NrvRows(source: SourceManifestItem, text: string): StagingRecord[] {
  const tableEvidence = findEvidenceExcerpt(text, ['表 A.', '营养素参考值'], { maxLines: 70 });
  if (!tableEvidence) return [];
  const rows = [
    ['能量', '8400', 'kJ'],
    ['蛋白质', '60', 'g'],
    ['脂肪', '60', 'g'],
    ['饱和脂肪', '20', 'g'],
    ['碳水化合物', '300', 'g'],
    ['膳食纤维', '25', 'g'],
    ['维生素 A', '800', 'μgRE'],
    ['维生素 D', '10', 'μg'],
    ['维生素 E', '14', 'mgα-TE'],
    ['维生素 K', '80', 'μg'],
    ['维生素 B1', '1.4', 'mg'],
    ['维生素 B2', '1.4', 'mg'],
    ['维生素 B6', '1.4', 'mg'],
    ['维生素 B12', '2.4', 'μg'],
    ['维生素 C', '100', 'mg'],
    ['烟酸', '14', 'mg'],
    ['叶酸', '400', 'μg 或 μgDFE'],
    ['泛酸', '5', 'mg'],
    ['生物素', '40', 'μg'],
    ['胆碱', '500', 'mg'],
    ['钙', '800', 'mg'],
    ['磷', '700', 'mg'],
    ['钾', '2000', 'mg'],
    ['钠', '2000', 'mg'],
    ['镁', '300', 'mg'],
    ['铁', '15', 'mg'],
    ['锌', '11', 'mg'],
    ['碘', '120', 'μg'],
    ['硒', '60', 'μg'],
    ['铜', '0.8', 'mg'],
    ['氟', '1', 'mg'],
    ['锰', '3', 'mg']
  ];

  return rows.map(([name, value, unit], index) => buildStagingRecord(source, {
    recordType: 'nutrition_reference_value',
    canonicalName: name,
    ingredientType: 'other',
    pageNumber: tableEvidence.pageNumber,
    tableName: '表 A.1 营养素参考值（NRV）',
    rowReference: `GB28050-2025-A1-NRV-${index + 1}`,
    rawSourceText: findEvidenceLine(tableEvidence.text, name) || tableEvidence.text,
    confidenceScore: '0.84',
    parsedData: {
      value,
      unit,
      populationScope: '36月龄以上人群',
      standardNo: source.standard_no,
      validFrom: source.effective_date,
      verificationMethod: 'official_pdf_appendix_a_table_a1_text_layer'
    }
  }));
}

function parseGb28050ContentClaimRows(source: SourceManifestItem, text: string): StagingRecord[] {
  const rows = [
    {
      nutrient: '糖',
      claimType: '无糖',
      terms: ['无或不含糖'],
      comparisonOperator: 'lte',
      thresholdValue: '0.5',
      thresholdUnit: 'g/100g(固体)或100mL(液体)',
      additionalConditions: '表 C.1 含量声称方式为“无或不含糖”；PDF 文本层小数存在拆行，结构化值需人工复核。'
    },
    {
      nutrient: '糖',
      claimType: '低糖',
      terms: ['低糖'],
      comparisonOperator: 'lte',
      thresholdValue: '5',
      thresholdUnit: 'g/100g(固体)或100mL(液体)',
      additionalConditions: '表 C.1 含量声称方式为“低糖”；结构化值需人工复核。'
    },
    {
      nutrient: '脂肪',
      claimType: '低脂',
      terms: ['低脂肪'],
      comparisonOperator: 'lte',
      thresholdValue: '3;1.5',
      thresholdUnit: 'g/100g(固体);g/100mL(液体)',
      additionalConditions: '表 C.1 含量声称方式为“低脂肪”；PDF 文本层将液体阈值拆行，结构化值需人工复核。'
    },
    {
      nutrient: '钠',
      claimType: '低钠',
      terms: ['低钠'],
      comparisonOperator: 'lte',
      thresholdValue: '120',
      thresholdUnit: 'mg/100g(固体)或100mL(液体)',
      additionalConditions: '表 C.1 说明符合“钠”声称时也可用“盐”字替代“钠”字；结构化值需人工复核。'
    },
    {
      nutrient: '蛋白质',
      claimType: '高蛋白',
      terms: ['高或富含蛋白质'],
      comparisonOperator: 'gte',
      thresholdValue: '20;10;10',
      thresholdUnit: '%NRV/100g(固体);%NRV/100mL(液体);%NRV/420kJ',
      additionalConditions: '表 C.1 含量声称方式为“高或富含蛋白质”；结构化值需人工复核。'
    },
    {
      nutrient: '能量',
      claimType: '能量低',
      terms: ['低能量或', '低卡、低千卡或低卡路里'],
      comparisonOperator: 'lte',
      thresholdValue: '170;80',
      thresholdUnit: 'kJ/100g(固体);kJ/100mL(液体)',
      additionalConditions: '表 C.1 含量声称方式为“低能量或低卡、低千卡或低卡路里”，并列有脂肪供能比限制；结构化值需人工复核。'
    },
    {
      nutrient: '膳食纤维',
      claimType: '富含膳食纤维',
      terms: ['高或富含膳食纤维'],
      comparisonOperator: 'gte',
      thresholdValue: '6;3;3',
      thresholdUnit: 'g/100g(固体);g/100mL(液体);g/420kJ',
      additionalConditions: '表 C.1 含量声称方式为“高或富含膳食纤维”；限制性条件要求膳食纤维总量或相关单体成分符合含量要求，结构化值需人工复核。'
    }
  ];

  return rows.flatMap((row, index) => {
    const evidence = findAppendixC1Evidence(text, row.terms, { maxLines: 12 });
    if (!evidence) return [];
    return [buildStagingRecord(source, {
      recordType: 'nutrition_content_claim_rule',
      canonicalName: row.nutrient,
      ingredientType: 'other',
      pageNumber: evidence.pageNumber,
      tableName: '表 C.1 能量和营养成分含量声称的要求和限制性条件',
      rowReference: `GB28050-2025-C1-${index + 1}`,
      rawSourceText: evidence.text,
      confidenceScore: '0.80',
      parsedData: {
        claimType: row.claimType,
        comparisonOperator: row.comparisonOperator,
        thresholdValue: row.thresholdValue,
        thresholdUnit: row.thresholdUnit,
        basisType: 'other',
        additionalConditions: row.additionalConditions,
        standardNo: source.standard_no,
        validFrom: source.effective_date,
        verificationMethod: 'official_pdf_appendix_c_table_c1_text_layer',
        reviewStatusReason: 'official PDF text layer parsed automatically; pending manual review before verified use'
      }
    })];
  });
}

function parseGb28050ComparativeClaimRows(source: SourceManifestItem, text: string): StagingRecord[] {
  const rows = [
    ['能量', '减少能量', 'decrease_gte', '25', '%', '与参考食品比较,能量值减少 25% 以上(含 25% )'],
    ['脂肪', '减少脂肪', 'decrease_gte', '25', '%', '与参考食品比较,脂肪含量减少 25% 以上(含 25% )'],
    ['饱和脂肪', '减少饱和脂肪', 'decrease_gte', '25', '%', '与参考食品比较,饱和脂肪含量减少 25% 以上(含 25% )'],
    ['糖', '减少糖', 'decrease_gte', '25', '%', '与参考食品比较,糖含量减少 25% 以上(含 25% )'],
    ['钠', '减少钠（盐）', 'decrease_gte', '25', '%', '与参考食品比较,钠含量减少 25% 以上(含 25% )'],
    ['蛋白质', '增加蛋白质', 'increase_gte', '25', '%', '与参考食品比较,蛋白质含量增加 25% 以上(含 25% )'],
    ['膳食纤维', '增加膳食纤维', 'increase_gte', '25', '%', '与参考食品比较,膳食纤维含量增加 25% 以上(含 25% )'],
    ['维生素', '增加维生素', 'increase_gte', '25', '%', '与参考食品比较,维生素含量增加 25% 以上(含 25% )'],
    ['矿物质', '增加矿物质（不包括钠）', 'increase_gte', '25', '%', '与参考食品比较,矿物质含量增加 25% 以上(含 25% )']
  ];

  return rows.flatMap(([nutrient, claimType, operator, threshold, unit, evidenceTerm], index) => {
    const evidence = findEvidenceExcerpt(text, [claimType.replace('（盐）', '(盐)'), claimType.replace('（盐）', ''), evidenceTerm], { maxLines: 8 });
    if (!evidence) return [];
    return [buildStagingRecord(source, {
      recordType: 'nutrition_comparative_claim_rule',
      canonicalName: nutrient,
      ingredientType: 'other',
      pageNumber: evidence.pageNumber,
      tableName: '表 C.2 能量和营养成分比较声称的要求和条件',
      rowReference: `GB28050-2025-C2-${index + 1}`,
      rawSourceText: evidence.text,
      confidenceScore: '0.82',
      parsedData: {
        claimType,
        comparisonOperator: operator,
        thresholdValue: threshold,
        thresholdUnit: unit,
        basisType: 'other',
        additionalConditions: '参考食品的数据来源需按表 C.2 条件执行',
        standardNo: source.standard_no,
        validFrom: source.effective_date,
        verificationMethod: 'official_pdf_appendix_c_table_c2_text_layer'
      }
    })];
  });
}

function parseOfficialQaRules(source: SourceManifestItem, html: string): StagingRecord[] {
  const text = htmlToText(html);
  const definitions = source.standard_no === 'GB 7718-2025'
    ? [
        ['standard_revision', '标准修订原则和修订内容', ['标准的修订原则']],
        ['ingredient_additive', '配料表、配料强调与食品添加剂解释', ['关于“配料表”“配料强调与定量标示”']],
        ['allergen', '致敏物质解释', ['关于致敏物质']],
        ['imported_food', '进口食品解释', ['关于进口食品']],
        ['digital_label', '数字标签解释', ['关于数字标签']]
      ]
    : [
        ['standard_revision', '标准修订目的和原则', ['标准的修订目的']],
        ['mandatory_nutrients', '强制标示营养素解释', ['关于强制标示的营养素']],
        ['salt_oil_sugar_prompt', '盐油糖提示语解释', ['关于强制标示“盐油糖”提示语']],
        ['nrv', '营养素参考值解释', ['营养素参考值（NRV）及其使用方法']],
        ['nutrition_claim', '营养声称和作用声称解释', ['关于附录C营养声称和附录D营养成分作用声称']],
        ['serving_size', '份量参考值解释', ['关于增加附录E预包装食品份量参考值']]
      ];

  const records = definitions.flatMap(([category, title, terms]) => {
    const evidence = findEvidenceExcerpt(text, terms as string[], { maxLines: 12, htmlText: true });
    if (!evidence) return [];
    return [buildRuleRecord(source, {
      recordType: `official_qa_${category}`,
      canonicalName: `${source.standard_no} 解读材料：${title}`,
      pageNumber: null,
      tableName: '官方解读材料',
      rowReference: `${source.source_id}-${category}`,
      rawSourceText: evidence.text,
      confidenceScore: '0.82',
      parsedData: {
        ruleCategory: category,
        standardNo: source.standard_no,
        sourceType: source.source_type,
        validFrom: source.effective_date,
        reviewStatusReason: 'official HTML interpretation excerpt parsed automatically; requires manual review before verified use'
      }
    })];
  });

  if (source.standard_no === 'GB 7718-2025') {
    records.push(...parseGb7718AllergenData(source, text, { htmlText: true }));
    records.push(...parseGb7718DigitalLabelRules(source, text, { htmlText: true }));
  }
  if (source.standard_no === 'GB 28050-2025') {
    records.push(...parseGb28050PolyolEnergyRulesFromQa(source, text));
  }

  return records;
}

function parseGb28050PolyolEnergyRulesFromQa(source: SourceManifestItem, text: string): StagingRecord[] {
  const evidence = findEvidenceExcerpt(text, ['糖醇', '赤藓糖醇', '糖醇及其能量换算系数'], { maxLines: 18, htmlText: true });
  if (!evidence || !/糖醇/u.test(evidence.text)) return [];
  const sourceUrl = source.official_page_url || source.original_source_url || source.attachment_url;
  const sharedParsedData = {
    includeInEnergyCalculation: /标示糖醇名称和含量|纳入能量计算/u.test(evidence.text),
    carbohydrateEnergyAdjustment: /碳水化合物/u.test(evidence.text)
      ? '如纳入能量计算，碳水化合物能量计算时应结合官方原文相应扣除糖醇能量。'
      : '',
    sectionTitle: '糖醇及其能量换算系数',
    sourceFile: source.local_file_path,
    sourceUrl,
    validFrom: source.effective_date,
    sourceType: source.source_type,
    reviewStatusReason: 'official GB 28050 QA excerpt parsed automatically; requires manual review before verified use'
  };
  return [
    buildStagingRecord(source, {
      recordType: 'nutrition_polyol_energy_rule',
      canonicalName: '赤藓糖醇',
      ingredientType: 'other',
      pageNumber: null,
      tableName: '糖醇能量换算系数',
      rowReference: `${source.source_id}-polyol-energy-erythritol`,
      rawSourceText: evidence.text,
      confidenceScore: '0.84',
      parsedData: {
        ...sharedParsedData,
        energyFactorKjPerG: '0'
      }
    }),
    buildStagingRecord(source, {
      recordType: 'nutrition_polyol_energy_rule',
      canonicalName: '其他糖醇',
      ingredientType: 'other',
      pageNumber: null,
      tableName: '糖醇能量换算系数',
      rowReference: `${source.source_id}-polyol-energy-other-polyols`,
      rawSourceText: evidence.text,
      confidenceScore: '0.84',
      parsedData: {
        ...sharedParsedData,
        energyFactorKjPerG: '10'
      }
    })
  ];
}

function parseOfficialNoticeRules(source: SourceManifestItem, html: string): StagingRecord[] {
  const text = htmlToText(html);
  if (source.local_file_path.includes('digital-label') || source.title.includes('数字标签')) {
    return parseGb7718DigitalLabelRules(source, text, { htmlText: true });
  }
  const evidence = findEvidenceExcerpt(text, ['GB 7718-2025', 'GB 28050-2025', '50项食品安全国家标准'], { maxLines: 24, htmlText: true });
  if (!evidence) return [];
  return [buildRuleRecord(source, {
    recordType: 'official_notice_standard_release',
    canonicalName: '2025年第2号食品安全国家标准发布公告',
    pageNumber: null,
    tableName: '官方公告',
    rowReference: source.announcement_no || source.source_id,
    rawSourceText: evidence.text,
    confidenceScore: '0.84',
    parsedData: {
      announcementNo: source.announcement_no,
      releasedStandards: ['GB 7718-2025', 'GB 28050-2025'],
      sourceType: source.source_type,
      validFrom: source.effective_date,
      reviewStatusReason: 'official HTML notice excerpt parsed automatically; requires manual review before verified use'
    }
  })];
}

function buildRuleRecord(
  source: SourceManifestItem,
  input: {
    recordType: string;
    canonicalName: string;
    pageNumber: number | null;
    tableName: string;
    rowReference: string;
    rawSourceText: string;
    parsedData: Record<string, unknown>;
    confidenceScore: string;
  }
) {
  return buildStagingRecord(source, {
    recordType: input.recordType,
    canonicalName: input.canonicalName,
    ingredientType: 'other',
    pageNumber: input.pageNumber,
    tableName: input.tableName,
    rowReference: input.rowReference,
    rawSourceText: input.rawSourceText,
    parsedData: input.parsedData,
    confidenceScore: input.confidenceScore
  });
}

function buildStagingRecord(
  source: SourceManifestItem,
  input: {
    recordType: string;
    canonicalName: string;
    ingredientType: string;
    pageNumber: number | null;
    tableName: string;
    rowReference: string;
    rawSourceText: string;
    parsedData: Record<string, unknown>;
    confidenceScore: string;
  }
): StagingRecord {
  const normalizedName = normalizeName(input.canonicalName);
  const idSeed = `${source.source_id}|${input.recordType}|${normalizedName}|${input.rowReference}`;
  return {
    id: `official-staging-${hashText(idSeed).slice(0, 24)}`,
    source_id: source.source_id,
    source_tier: source.source_tier,
    source_status: source.source_status,
    record_type: input.recordType,
    canonical_name: input.canonicalName,
    normalized_name: normalizedName,
    ingredient_type: input.ingredientType,
    page_number: input.pageNumber,
    table_name: input.tableName,
    row_reference: input.rowReference,
    raw_source_text: input.rawSourceText,
    parsed_data: input.parsedData,
    parse_status: 'parsed',
    review_status: 'pending_review',
    confidence_score: input.confidenceScore,
    content_hash: hashText(`${source.sha256}|${input.rawSourceText}`)
  };
}

async function writePipelineArtifacts(snapshot: PipelineSnapshot) {
  const paths = getPipelinePaths();
  await ensureDirs();
  await writeJson(join(paths.manifestsDir, 'sources.json'), snapshot.sources);
  await writeJson(join(paths.docsDir, 'source-materials-manifest.json'), buildSourceMaterialsManifest(snapshot));
  await writeJson(join(paths.stagingDir, 'ingredient-official-staging.json'), snapshot.staging_records);
  await writeJson(join(paths.failedDir, 'extract-failures.json'), snapshot.failed);
  await writeFile(
    join(paths.checksumsDir, 'sha256sums.txt'),
    snapshot.sources.map((source) => `${source.sha256}  ${source.local_file_path}`).join('\n') + '\n'
  );
  await writeFile(join(paths.manifestsDir, 'sources.yaml'), renderSourcesYaml(snapshot.sources));
  await writeFile(join(paths.reportsDir, 'pipeline-summary.json'), JSON.stringify(snapshot, null, 2));
}

async function writeOfficialReports(snapshot: PipelineSnapshot, pool: pg.Pool | null) {
  await ensureDirs();
  await writeSourceMaterialsDownloadReport(snapshot);
  await writeSourceMaterialsMissingOfficialReport(snapshot);
  await writeOfficialSourceInventory(snapshot);
  await writeManualDownloadReport(snapshot);
  await writeConflictsReport(pool);
  await writeAllergenDataReport(pool);
  await writeAliasConflictReviewReport(pool);
  await writeUnlinkedStagingReviewReport(pool);
  await writeUnverifiedExistingDataReport(pool);
  await writeCoverageReport(snapshot, pool);
  await writeDataQualityReport(snapshot, pool);
  await writeNutritionClaimCoverageReport(pool);
}

async function writeOfficialSourceInventory(snapshot: PipelineSnapshot) {
  const paths = getPipelinePaths();
  const rows = snapshot.sources.map((source) => `| ${source.local_file_path} | ${source.sha256} | ${source.title} | ${source.standard_no || source.announcement_no || ''} | ${source.source_org} | ${source.source_tier} | ${source.source_status} | ${source.license} | ${source.parse_status} | ${source.verification_status} |`);
  const duplicates = snapshot.duplicates.length === 0
    ? '- 无重复 SHA-256 文件。'
    : snapshot.duplicates.map((item) => `- ${item.sha256}: ${item.paths.join(', ')}`).join('\n');
  const content = `# 官方与补充来源清单

生成时间：${snapshot.generated_at}

输入目录：\`docs/source-materials/\`

## 来源文件

| 文件 | SHA-256 | 标题 | 标准号/公告号 | 发布机构 | 来源等级 | 来源状态 | 许可 | 解析状态 | 核验状态 |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## 自动下载文件

本轮只保存白名单官方或准官方来源文件；未使用第三方转载文件作为 S0 替代来源。

## 重复文件

${duplicates}

## 非官方补充来源

本轮未导入 S1-S4 非官方补充数据。普通食品原料没有官方全量目录，未使用第三方词库伪装官方覆盖。

## 缺失文件

详见 [source-materials-missing-official.md](./source-materials-missing-official.md)。
`;
  await writeFile(join(paths.docsDir, 'official-source-inventory.md'), content);
}

function buildSourceMaterialsManifest(snapshot: PipelineSnapshot) {
  const downloaded = snapshot.sources.map((source) => ({
    title: source.title,
    standard_no: source.standard_no,
    source_tier: source.source_tier,
    publisher: source.source_org,
    source_url: source.official_page_url || source.attachment_url || source.original_source_url,
    local_path: source.local_file_path,
    file_type: source.file_type,
    sha256: source.sha256,
    downloaded_at: source.retrieved_at,
    publication_date: source.publication_date,
    effective_date: source.effective_date,
    status: 'downloaded',
    notes: [
      `official_source_id=${source.source_id}`,
      source.notes,
      source.parse_status && source.parse_status !== 'inventory_only' ? `parse_status=${source.parse_status}` : ''
    ].filter(Boolean).join(' ')
  }));
  const manual = snapshot.manual_downloads.map((item) => ({
    title: item.title,
    standard_no: item.standard_no,
    source_tier: 'S0',
    publisher: item.source_org,
    source_url: item.official_page_url,
    local_path: '',
    file_type: '',
    sha256: '',
    downloaded_at: snapshot.generated_at,
    publication_date: '',
    effective_date: '',
    status: 'manual_required',
    notes: item.reason
  }));
  return [...downloaded, ...manual];
}

async function writeSourceMaterialsDownloadReport(snapshot: PipelineSnapshot) {
  const paths = getPipelinePaths();
  const downloadedRows = snapshot.sources.map((source) => `| ${source.title} | ${source.standard_no || source.announcement_no || ''} | ${source.file_type.toUpperCase()} | ${source.local_file_path} | ${source.file_size} | ${source.sha256} | ${source.source_id} | ${source.parse_status} |`);
  const htmlCount = snapshot.sources.filter((source) => source.file_type === 'html' || source.file_type === 'htm').length;
  const pdfCount = snapshot.sources.filter((source) => source.file_type === 'pdf').length;
  const content = `# 官方源文件下载报告

生成时间：${snapshot.generated_at}

## 汇总

| 指标 | 数量 |
|---|---:|
| 已保存官方文件 | ${snapshot.sources.length} |
| PDF 文件 | ${pdfCount} |
| HTML 文件 | ${htmlCount} |
| 需要人工下载/确认 | ${snapshot.manual_downloads.length} |
| 解析失败 | ${snapshot.failed.length} |
| 重复 SHA-256 | ${snapshot.duplicates.length} |

## 已保存文件

| 标题 | 标准号/公告号 | 类型 | 本地路径 | 字节数 | SHA-256 | official_source | 解析状态 |
|---|---|---|---|---:|---|---|---|
${downloadedRows.join('\n')}

## HTML 保存文件

${snapshot.sources.filter((source) => source.file_type === 'html' || source.file_type === 'htm').map((source) => `- ${source.local_file_path}: ${source.title} (${source.sha256})`).join('\n') || '- 无'}

## PDF 保存文件

${snapshot.sources.filter((source) => source.file_type === 'pdf').map((source) => `- ${source.local_file_path}: ${source.title} (${source.sha256})`).join('\n') || '- 无'}

## 未使用的来源

- 未使用百度文库、道客巴巴、个人博客、微信搬运、CSDN、不明网盘或第三方食品法规站作为 S0。
- \`docs/source-materials/_invalid/1401947724374.pdf.partial\` 为 GB 28050-2011 自动下载超时后的不完整文件，已移出有效扫描范围，未进入 manifest、official_sources 或解析流程。
`;
  await writeFile(join(paths.docsDir, 'source-materials-download-report.md'), content);
}

async function writeSourceMaterialsMissingOfficialReport(snapshot: PipelineSnapshot) {
  const paths = getPipelinePaths();
  const content = `# 缺失官方源文件清单

生成时间：${snapshot.generated_at}

以下项目本轮未使用第三方替代文件作为 S0。人工补齐后应放入 \`docs/source-materials/\`，再执行 \`npm run ingredient:update-all\`。

| 缺失文件/页面 | 标准号/公告号 | 官方入口 | 搜索关键词 | 人工步骤 | 安全默认处理 |
|---|---|---|---|---|---|
${snapshot.manual_downloads.map((item) => `| ${item.title} | ${[item.standard_no, item.announcement_no].filter(Boolean).join(' / ')} | ${item.official_page_url} | ${item.standard_no || item.title} | 进入官方入口搜索关键词；下载或保存官方 PDF/HTML；放入 \`docs/source-materials/${item.suggested_file_name}\`；重新运行导入命令。 | 不导入、不标 S0 verified；相关规则保持缺失或 pending_review。 |`).join('\n')}

## 本轮自动失败详情

${snapshot.manual_downloads.map((item) => `- ${item.title}: ${item.reason}`).join('\n') || '- 无'}

## 专项原文缺口

- GB 28050-2025 糖醇能量规则：已在本地保存的 GB 28050-2025 官方 PDF、GB 28050-2025 官方问答 HTML 中检索“糖醇”“赤藓糖醇”“糖醇及其能量换算系数”，未定位到可引用官方原文；本轮不导入糖醇能量规则，不使用第三方转载替代。
- 官方入口：食品安全国家标准数据检索平台 https://sppt.cfsa.net.cn:8086/db
- 建议搜索关键词：GB 28050-2025 糖醇、赤藓糖醇 能量换算系数、糖醇及其能量换算系数、GB 28050-2025 问答 糖醇。
`;
  await writeFile(join(paths.docsDir, 'source-materials-missing-official.md'), content);
}

async function writeManualDownloadReport(snapshot: PipelineSnapshot) {
  const paths = getPipelinePaths();
  const content = `# 人工下载清单

生成时间：${snapshot.generated_at}

以下文件本轮未使用第三方转载替代。下载后应放置目录：\`docs/source-materials/\`。

| 文件正式名称 | 标准号/公告号 | 发布机构 | 官方公告页面 | 官方附件地址 | 建议文件名 | 下载失败原因 | 数据类别 | 优先级 |
|---|---|---|---|---|---|---|---|---|
${snapshot.manual_downloads.map((item) => `| ${item.title} | ${[item.standard_no, item.announcement_no].filter(Boolean).join(' / ')} | ${item.source_org} | ${item.official_page_url} | ${item.attachment_url || '待确认'} | ${item.suggested_file_name} | ${item.reason} | ${item.category} | ${item.priority} |`).join('\n')}
`;
  await writeFile(join(paths.docsDir, 'manual-download-required.md'), content);
}

async function writeCoverageReport(snapshot: PipelineSnapshot, pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const stats = pool ? await getOfficialDataDbStats(pool) : null;
  const stagingByType = countBy(snapshot.staging_records, (row) => row.record_type);
  const content = `# 食品成分知识库覆盖报告

生成时间：${snapshot.generated_at}

统计口径：${stats ? '本地 PostgreSQL 实际查询结果。' : '来源文件扫描和 staging JSON 结果，未读取数据库。'}

## 数据库数量

| 指标 | 数量 |
|---|---:|
| 修改前兼容 ingredients 数量 | ${stats?.legacyIngredients ?? 0} |
| 修改后 ingredient_master 数量 | ${stats?.ingredientMaster ?? 0} |
| 本次新增/派生 ingredient_master 数量 | ${stats?.ingredientMaster ?? 0} |
| food_additive 数量 | ${stats?.ingredientTypes.food_additive ?? 0} |
| nutrition_fortifier 数量 | ${stats?.ingredientTypes.nutrition_fortifier ?? 0} |
| novel_food_ingredient 数量 | ${stats?.ingredientTypes.novel_food_ingredient ?? 0} |
| food_medicine_substance 数量 | ${stats?.ingredientTypes.food_medicine_substance ?? 0} |
| food_microorganism 数量 | ${stats?.ingredientTypes.food_microorganism ?? 0} |
| ordinary_ingredient 数量 | ${stats?.ingredientTypes.ordinary_ingredient ?? 0} |
| ingredient_aliases 数量 | ${stats?.ingredientAliases ?? 0} |
| ingredient_tags 数量 | ${stats?.ingredientTags ?? 0} |
| ingredient_relations 数量 | ${stats?.ingredientRelations ?? 0} |
| allergen_categories 数量 | ${stats?.allergenCategories ?? 0} |
| allergen_aliases 数量 | ${stats?.allergenAliases ?? 0} |
| allergen_labeling_rules 数量 | ${stats?.allergenLabelingRules ?? 0} |
| ingredient_allergen_relations 数量 | ${stats?.ingredientAllergenRelations ?? 0} |
| digital_label_rules 数量 | ${stats?.digitalLabelRules ?? 0} |
| nutrients 数量 | ${stats?.nutrients ?? 0} |
| nutrition_reference_values 数量 | ${stats?.nutritionReferenceValues ?? 0} |
| nutrition_claim_rules 数量 | ${stats?.nutritionClaimRules ?? 0} |
| nutrition_polyol_energy_rules 数量 | ${stats?.nutritionPolyolEnergyRules ?? 0} |
| additive_usage_rules 数量 | ${stats?.additiveUsageRules ?? 0} |
| nutrition_fortifier_rules 数量 | ${stats?.nutritionFortifierRules ?? 0} |
| import_errors 数量 | ${stats?.importErrors ?? 0} |
| official_sources 数量 | ${stats?.officialSources ?? 0} |
| verified_regulation 数量 | ${stats?.regulatoryStatuses.verified_regulation ?? 0} |
| verified_official_standard 数量 | ${stats?.sourceStatuses.verified_official_standard ?? 0} |
| verified_official_catalog 数量 | ${stats?.sourceStatuses.verified_official_catalog ?? 0} |
| verified_international_official 数量 | ${stats?.sourceStatuses.verified_international_official ?? 0} |
| verified_secondary 数量 | ${stats?.sourceStatuses.verified_secondary ?? 0} |
| observed_digital_label 数量 | ${stats?.sourceStatuses.observed_digital_label ?? 0} |
| manual_verified 数量 | ${stats?.sourceStatuses.manual_verified ?? 0} |
| staging 数量 | ${stats?.ingredientImportStaging ?? snapshot.staging_records.length} |
| 正式提升数量（current source relations） | ${stats?.currentSourceRelations ?? 0} |
| pending_review ingredient 数量 | ${stats?.pendingReviewIngredients ?? 0} |
| pending_review staging 数量 | ${stats?.pendingReviewStaging ?? snapshot.staging_records.length} |
| unverified 数量 | ${stats?.unverifiedIngredients ?? 0} |
| 重复数量 | ${snapshot.duplicates.length} |
| 冲突数量 | ${stats?.aliasConflicts ?? 0} |
| 解析失败数量 | ${snapshot.failed.length} |
| 下载失败数量 | ${snapshot.manual_downloads.length} |
| 未链接 staging 全量 | ${stats?.unlinkedStaging ?? 0} |
| 需人工处理的未链接 ingredient-like staging | ${stats?.unlinkedActionableStaging ?? 0} |

## ingredient_type

${renderCountTable(stats?.ingredientTypes || {}, 'ingredient_type')}

## 来源状态

${renderCountTable(stats?.sourceStatuses || {}, 'source_status')}

## 各来源实际导入数量

${renderCountTable(stats?.recordsBySource || {}, 'source_id')}

## staging 解析记录类型

${renderCountTable(stagingByType, 'record_type')}

## 当前使用的标准版本

- GB 2760-2024：已使用本地 PDF SHA-256 与现有 GB2760 staging/reference 数据。
- GB 14880-2012：已从本地 PDF 文本层抽取部分营养强化剂使用范围，全部保持 pending_review。
- GB 7718-2025：已从 CFSA/SPPT 官方 PDF 抽取配料表、食品添加剂、复合配料、致敏物质、食品声称、日期/保质期/贮存、进口食品、数字标签和豁免标示规则片段，全部保持 pending_review。
- GB 7718-2011：已从 CFSA/SPPT 官方 PDF 抽取旧版配料表、食品添加剂、致敏物质、日期/贮存和豁免规则片段，全部保持 pending_review。
- GB 28050-2025：已从 CFSA/SPPT 官方 PDF 抽取强制营养成分、能量换算、NRV、营养声称、比较声称和豁免强制标示规则片段；NRV 与可结构化比较声称进入专用营养表，全部保持 pending_review。
- GB 7718-2025 / GB 28050-2025 解读材料：已保存 CFSA/SPPT 官方 HTML 并抽取解释性片段，全部保持 pending_review。
- 2025年第2号公告：已保存 CFSA/SPPT 官方 HTML 并登记发布公告来源。
- 三新食品 2023 汇总目录：已抽取目录项进入 staging/pending_review。
- 食药物质新增目录：已抽取本地文件中 13 个目录项进入 staging/pending_review。
- 可用于食品的菌种名单：已抽取文本层可识别菌种进入 staging/pending_review；可用于婴幼儿食品的菌种名单：本地 PDF 无文本层，已保存 RapidOCR 原始 JSON 作为 OCR 辅助证据并抽取 14 条进入 staging/pending_review，仍需人工复核，不提升为 verified。

## 缺失或需人工补齐

- GB 28050-2011 官方 PDF 已从 CFSA/SPPT 官方附件下载并进入 official_sources。
- 独立的“国家卫生健康委、市场监管总局关于实施预包装食品数字标签有关事项的公告”官方页面未自动定位；本轮仅使用 GB 7718-2025 正文和解读材料中的数字标签要求，公告专属规则继续 manual_required。
- GB 28050-2025 中“糖醇能量规则”未通过已保存官方 PDF/HTML 自动关键词定位到可引用原文片段，未导入该专项规则。

## 当前尚未覆盖的数据类别

- 普通食品原料不存在官方全量目录，本轮未声称全量覆盖。
- 过敏原规则、营养 NRV 和营养声称规则已有自动抽取记录，但均未人工复核，不能作为 verified 规则展示。
- 三新食品汇总目录之后至 2026-06-18 的增量公告需要继续逐条下载官方附件。
- 婴幼儿食品菌种名单已通过 RapidOCR 辅助抽取候选记录，因来源为扫描 PDF OCR 结果，仍需人工复核后才能提升。

## 下一次更新命令

\`\`\`bash
npm run ingredient:inventory
npm run ingredient:fetch
npm run ingredient:extract
npm --prefix backend run db:migrate
npm run ingredient:import
npm run ingredient:validate
npm run ingredient:report
npm run ingredient:update-all
\`\`\`
`;
  await writeFile(join(paths.docsDir, 'official-food-data-coverage.md'), content);
}

async function writeDataQualityReport(snapshot: PipelineSnapshot, pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const stats = pool ? await getOfficialDataDbStats(pool) : null;
  const stagingByReviewStatus = countBy(snapshot.staging_records, (row) => row.review_status);
  const sourcesWithoutKnownOfficialMeta = snapshot.sources.filter((source) => source.source_org === '待核验官方来源');
  const content = `# 数据质量报告

生成时间：${snapshot.generated_at}

## 来源可信度

| 指标 | 数量 |
|---|---:|
| S0 来源文件 | ${snapshot.sources.filter((source) => source.source_tier === 'S0').length} |
| 非 S0 来源文件 | ${snapshot.sources.filter((source) => source.source_tier !== 'S0').length} |
| 待核验来源元数据文件 | ${sourcesWithoutKnownOfficialMeta.length} |
| 需要人工下载/确认 | ${snapshot.manual_downloads.length} |
| 重复 SHA-256 | ${snapshot.duplicates.length} |

## 数据库质量

| 指标 | 数量 |
|---|---:|
| official_sources | ${stats?.officialSources ?? 0} |
| ingredient_import_staging | ${stats?.ingredientImportStaging ?? snapshot.staging_records.length} |
| pending_review staging | ${stats?.pendingReviewStaging ?? stagingByReviewStatus.pending_review ?? 0} |
| pending_review ingredient | ${stats?.pendingReviewIngredients ?? 0} |
| allergen_categories | ${stats?.allergenCategories ?? 0} |
| allergen_aliases | ${stats?.allergenAliases ?? 0} |
| allergen_labeling_rules | ${stats?.allergenLabelingRules ?? 0} |
| ingredient_allergen_relations | ${stats?.ingredientAllergenRelations ?? 0} |
| digital_label_rules | ${stats?.digitalLabelRules ?? 0} |
| nutrition_reference_values | ${stats?.nutritionReferenceValues ?? 0} |
| nutrition_claim_rules | ${stats?.nutritionClaimRules ?? 0} |
| nutrition_polyol_energy_rules | ${stats?.nutritionPolyolEnergyRules ?? 0} |
| import_errors | ${stats?.importErrors ?? 0} |
| unlinked staging 全量 | ${stats?.unlinkedStaging ?? 0} |
| unlinked actionable staging | ${stats?.unlinkedActionableStaging ?? 0} |
| alias conflicts | ${stats?.aliasConflicts ?? 0} |
| extract failures | ${snapshot.failed.length} |
| ingredient_master 必填字段缺口 | ${stats?.ingredientRequiredFieldGaps ?? 0} |
| official_sources 必填字段缺口 | ${stats?.sourceRequiredFieldGaps ?? 0} |
| staging 来源外键缺口 | ${stats?.stagingSourceGaps ?? 0} |
| source relation 外键缺口 | ${stats?.sourceRelationGaps ?? 0} |

## pending_review 说明

- 本轮从 GB 7718-2025、GB 7718-2011、GB 28050-2025、解读材料和公告抽取的标签/营养规则均为自动抽取，默认 \`pending_review\`。
- NRV 与比较声称即使写入专用营养表，状态仍是 \`pending_review\`，不能作为已验证法规结论展示。
- 未找到或无法完整下载的官方资料不会使用第三方文件替代，不会写入 S0 \`official_sources\`。

## import_errors

${stats?.importErrors ? '- 数据库中存在 import_errors，需查看导入批次明细。' : '- 当前统计未发现 import_errors。'}

## 需要人工复核

${[
  ...snapshot.manual_downloads.map((item) => `- ${item.title}: ${item.reason}`),
  stats?.nutritionPolyolEnergyRules ? '' : '- GB 28050-2025 糖醇能量规则未在已保存官方 PDF/HTML 中自动定位到原文片段，未导入。',
  '- 所有标签/营养解释性规则需要人工复核条款边界、适用范围和最终展示文案。'
].filter(Boolean).join('\n')}

## 结论

本轮没有发现正式 S0 来源记录缺少本地文件或 SHA-256；没有把第三方资料标成 S0。仍未达到食品成分知识库全量覆盖，普通食品原料和商品标签写法仍需后续按来源等级补充。
`;
  await writeFile(join(paths.docsDir, 'data-quality-report.md'), content);
}

async function writeNutritionClaimCoverageReport(pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const requiredClaims = [
    '无糖',
    '低糖',
    '低脂',
    '低钠',
    '高蛋白',
    '能量低',
    '富含膳食纤维'
  ];
  const rows = pool ? await pool.query(
    `select
       r.claim_type,
       n.canonical_name as nutrient,
       r.comparison_operator,
       r.threshold_value,
       r.threshold_unit,
       r.basis_type,
       r.additional_conditions,
       r.status,
       os.source_tier,
       os.source_type,
       os.title as source_title,
       os.local_file_path,
       os.source_url
     from nutrition_claim_rules r
     join nutrients n on n.id = r.nutrient_id
     join official_sources os on os.id = r.source_id
     where r.claim_type = any($1::text[])
     order by array_position($1::text[], r.claim_type)`,
    [requiredClaims]
  ) : { rows: [] };
  const evidenceRows = pool ? await pool.query(
    `select
       parsed_data->>'claimType' as claim_type,
       source_id,
       table_name,
       page_number,
       raw_source_text
     from ingredient_import_staging
     where record_type = 'nutrition_content_claim_rule'
       and parsed_data->>'claimType' = any($1::text[])
     order by row_reference`,
    [requiredClaims]
  ) : { rows: [] };
  const byClaim = new Map(rows.rows.map((row) => [String(row.claim_type), row]));
  const evidenceByClaim = new Map(evidenceRows.rows.map((row) => [String(row.claim_type), row]));
  const coverageRows = requiredClaims.map((claim) => {
    const row = byClaim.get(claim);
    const evidence = evidenceByClaim.get(claim);
    if (!row) {
      return `| ${claim} | missing |  |  |  |  | 未导入；未定位到官方原文或导入未执行。 |`;
    }
    return `| ${claim} | covered | ${row.nutrient} | ${row.threshold_value} ${row.threshold_unit} | ${row.status} | ${row.source_tier}/${row.source_type} | ${evidence?.raw_source_text ? summarizeEvidence(String(evidence.raw_source_text)).replace(/\|/g, '/') : row.additional_conditions} |`;
  });
  const missing = requiredClaims.filter((claim) => !byClaim.has(claim));
  const content = `# 营养声称规则覆盖报告

生成时间：${new Date().toISOString()}

统计口径：仅检查 GB 28050-2025 官方 PDF/HTML/问答中可定位原文并已写入 \`nutrition_claim_rules\` 的规则；所有自动抽取记录保持 \`pending_review\`。

## 必查声称覆盖

| 声称 | 覆盖状态 | 营养成分 | 阈值 | review_status | 来源 | raw_text/evidence 摘要 |
|---|---|---|---|---|---|---|
${coverageRows.join('\n')}

## 缺口

${missing.length === 0 ? '- 本轮要求的 7 个声称均已有 GB 28050-2025 官方 PDF 文本层证据和 pending_review 结构化记录。' : missing.map((claim) => `- ${claim}: 未在官方来源中完成结构化导入，不编造阈值。`).join('\n')}

## 注意事项

- PDF 文本层对表 C.1 的个别小数和版式存在拆行；已保留 raw_text，结构化阈值需人工复核后才能 promoted/verified。
- 本报告不使用第三方营养声称表作为 S0 来源。
`;
  await writeFile(join(paths.docsDir, 'nutrition-claim-coverage-report.md'), content);
}

async function writeConflictsReport(pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const conflicts = pool ? await queryAliasConflicts(pool) : [];
  const content = `# 官方数据冲突报告

生成时间：${new Date().toISOString()}

## 别名冲突

| normalized_alias | 涉及成分数 |
|---|---:|
${conflicts.length === 0 ? '| none | 0 |' : conflicts.map((row) => `| ${row.normalized_alias} | ${row.count} |`).join('\n')}

## 其他冲突类型

- 规范名称冲突：本轮通过 \`ingredient_master(normalized_name, ingredient_type)\` 唯一约束避免无理由重复。
- INS/CNS 冲突：GB 2760 旧冲突仍以别名冲突形式报告，不自动合并。
- 来源版本冲突：未发现同一 SHA-256 之外的多版本覆盖；缺失版本见人工下载清单。
- 最大使用量冲突、有效期冲突：本轮新增 GB 14880 抽取记录全部 pending_review，未覆盖当前 verified 规则。
- 官方与非官方冲突：本轮未导入非官方补充来源。
`;
  await writeFile(join(paths.docsDir, 'official-data-conflicts.md'), content);
}

async function writeAllergenDataReport(pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const categories = pool ? await queryRows(pool, `
    select ac.code, ac.canonical_name, ac.status, os.title as source_title, os.source_tier
    from allergen_categories ac
    left join official_sources os on os.id = ac.source_id
    order by ac.code
  `) : [];
  const aliases = pool ? await queryRows(pool, `
    select ac.code, ac.canonical_name as category_name, aa.alias_name, aa.alias_type,
           aa.confidence, aa.review_status, aa.evidence_summary
    from allergen_aliases aa
    join allergen_categories ac on ac.id = aa.allergen_category_id
    order by ac.code, aa.alias_name
  `) : [];
  const rules = pool ? await queryRows(pool, `
    select rule_type, title, review_status, confidence, source_file, source_url, evidence_summary
    from allergen_labeling_rules
    order by rule_type, title, source_file, source_url, evidence_summary
  `) : [];
  const relations = pool ? await queryRows(pool, `
    select iar.ingredient_id, im.canonical_name as ingredient_name, ac.canonical_name as allergen_category,
           iar.relation_type, iar.confidence, iar.review_status, iar.evidence_summary
    from ingredient_allergen_relations iar
    join ingredient_master im on im.id = iar.ingredient_id
    join allergen_categories ac on ac.id = iar.allergen_category_id
    order by ac.canonical_name, im.canonical_name
  `) : [];
  const noRelationNote = relations.length === 0
    ? '\n- 本轮未生成 ingredient_allergen_relations：当前 ingredient_master/ingredient_aliases 中没有“小麦、虾、鸡蛋、花生、大豆、牛奶、坚果”等过敏原普通食材的可靠 exact normalized match。为避免强行关联或新增无证据 ingredient，关系表保持 0，待普通食品原料官方/企业一手来源补齐后再关联。'
    : '';
  const content = `# 过敏原数据报告

生成时间：${new Date().toISOString()}

## 汇总

| 指标 | 数量 |
|---|---:|
| allergen_categories | ${categories.length} |
| allergen_aliases | ${aliases.length} |
| allergen_labeling_rules | ${rules.length} |
| ingredient_allergen_relations | ${relations.length} |

## allergen_categories

| code | canonical_name | status | source_tier | official_source |
|---|---|---|---|---|
${categories.length === 0 ? '| none | none | none | none | none |' : categories.map((row) => `| ${row.code} | ${row.canonical_name} | ${row.status} | ${row.source_tier || ''} | ${escapeMarkdownTable(String(row.source_title || ''))} |`).join('\n')}

## allergen_aliases

| category | alias | alias_type | confidence | review_status | evidence_summary |
|---|---|---|---|---|---|
${aliases.length === 0 ? '| none | none | none | none | none | none |' : aliases.map((row) => `| ${row.category_name} | ${row.alias_name} | ${row.alias_type} | ${row.confidence} | ${row.review_status} | ${escapeMarkdownTable(String(row.evidence_summary || ''))} |`).join('\n')}

## allergen_labeling_rules

| rule_type | title | review_status | confidence | source_file | source_url | evidence_summary |
|---|---|---|---|---|---|---|
${rules.length === 0 ? '| none | none | none | none | none | none | none |' : rules.map((row) => `| ${row.rule_type} | ${row.title} | ${row.review_status} | ${row.confidence} | ${row.source_file || ''} | ${row.source_url || ''} | ${escapeMarkdownTable(String(row.evidence_summary || ''))} |`).join('\n')}

## ingredient_allergen_relations

| ingredient_id | ingredient_name | allergen_category | relation_type | confidence | review_status | evidence_summary |
|---|---|---|---|---|---|---|
${relations.length === 0 ? '| none | none | none | none | none | none | none |' : relations.map((row) => `| ${row.ingredient_id} | ${row.ingredient_name} | ${row.allergen_category} | ${row.relation_type} | ${row.confidence} | ${row.review_status} | ${escapeMarkdownTable(String(row.evidence_summary || ''))} |`).join('\n')}

## 复核边界

- 所有过敏原分类、别名、标示规则和自动关联均为 \`pending_review\`。
- 别名中未逐字出现在官方片段内的项目只作为候选别名，不能用于高置信自动匹配。
- ingredient 关联仅使用 exact normalized match；跳过了明显易混淆的候选词。${noRelationNote}
`;
  await writeFile(join(paths.docsDir, 'allergen-data-report.md'), content);
}

async function writeAliasConflictReviewReport(pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const conflicts = pool ? await queryAliasConflictDetails(pool) : [];
  const content = `# 别名冲突复核报告

生成时间：${new Date().toISOString()}

说明：本报告列出同一 normalized alias 指向多个 ingredient_master 的情况。本轮对这些 alias 统一标记为 \`alias_confidence=ambiguous\`、\`match_policy=candidate_only\`；未自动合并不确定项。

| alias | matched ingredient_ids | canonical_names | ingredient_types | source_tier | official_source | page_no | raw_text | conflict_reason | suggested_action |
|---|---|---|---|---|---|---|---|---|---|
${conflicts.length === 0 ? '| none | none | none | none | none | none | none | none | none | none |' : conflicts.map((row) => `| ${row.alias} | ${escapeMarkdownTable(row.ingredient_ids.join('<br>'))} | ${escapeMarkdownTable(row.canonical_names.join('<br>'))} | ${escapeMarkdownTable(row.ingredient_types.join('<br>'))} | ${escapeMarkdownTable(row.source_tiers.join('<br>'))} | ${escapeMarkdownTable(row.official_sources.join('<br>'))} | ${escapeMarkdownTable(row.page_nos.join('<br>'))} | ${escapeMarkdownTable(row.raw_texts.join('<br>'))} | ${escapeMarkdownTable(row.conflict_reason)} | ${escapeMarkdownTable(row.suggested_action)} |`).join('\n')}

## 处理结果

- 已处理冲突别名数量：${conflicts.length}
- 自动合并数量：0
- 标记 ambiguous/candidate_only 数量：${conflicts.length}
- 原则：不为降低冲突数而强行合并；冲突别名只能作为候选项返回。
`;
  await writeFile(join(paths.docsDir, 'alias-conflict-review.md'), content);
}

async function writeUnlinkedStagingReviewReport(pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const rows = pool ? await queryRows(pool, `
    select s.id, s.canonical_name, s.record_type, s.ingredient_type, s.source_id,
           os.local_file_path as source_file, os.source_type, s.raw_source_text, s.parsed_data,
           s.review_status
    from ingredient_import_staging s
    left join ingredient_master m
      on m.normalized_name = s.normalized_name
     and m.ingredient_type = s.ingredient_type
    left join official_sources os on os.id = s.source_id
    where m.id is null
    order by s.record_type, s.canonical_name, s.id
  `) : [];
  const content = `# 未链接 staging 复核报告

生成时间：${new Date().toISOString()}

说明：不删除任何 staging 原始记录。规则类、营养类和公告类记录通常不应链接到 \`ingredient_master\`，本报告逐条给出未链接原因和建议动作。

| staging_id | name | source_file | source_type | raw_text | 未链接原因 | 建议动作 |
|---|---|---|---|---|---|---|
${rows.length === 0 ? '| none | none | none | none | none | none | none |' : rows.map((row) => {
  const review = classifyUnlinkedStaging(row);
  return `| ${row.id} | ${escapeMarkdownTable(String(row.canonical_name || ''))} | ${escapeMarkdownTable(String(row.source_file || ''))} | ${row.source_type || ''} | ${escapeMarkdownTable(String(row.raw_source_text || '').slice(0, 600))} | ${escapeMarkdownTable(review.reason)} | ${escapeMarkdownTable(review.action)} |`;
}).join('\n')}

## 汇总

- 未链接 staging 报告条数：${rows.length}
- 可自动链接：${rows.filter((row) => classifyUnlinkedStaging(row).autoLinkable).length}
- needs_manual_check：${rows.filter((row) => classifyUnlinkedStaging(row).needsManualCheck).length}
- 专用规则表/非 ingredient_master 记录：${rows.filter((row) => classifyUnlinkedStaging(row).specialTableRecord).length}
`;
  await writeFile(join(paths.docsDir, 'unlinked-staging-review.md'), content);
}

async function writeUnverifiedExistingDataReport(pool: pg.Pool | null) {
  const paths = getPipelinePaths();
  const rows = pool ? await pool.query(
    `select id, name_cn, data_status, source_scope, risk_level
     from ingredients
     where data_status in ('unverified', 'common_ingredient', 'verified_jecfa')
        or source_scope not in ('gb_2760_regulation')
     order by data_status, id
     limit 500`
  ) : { rows: [] };
  const content = `# 未验证旧数据

生成时间：${new Date().toISOString()}

说明：以下来自旧 \`ingredients\` 兼容表或旧 seed。它们未被本轮伪装为中国官方监管数据；既有 risk_level 保留兼容，不根据官方目录自动生成新风险等级。

| id | 名称 | data_status | source_scope | risk_level |
|---|---|---|---|---|
${rows.rows.length === 0 ? '| none | none | none | none | none |' : rows.rows.map((row) => `| ${row.id} | ${row.name_cn} | ${row.data_status} | ${row.source_scope} | ${row.risk_level} |`).join('\n')}

## 建议处理

- 有明确官方依据的旧数据，后续通过 source relation 逐条挂接来源。
- JECFA/国际安全评价只作为安全评价来源，不得覆盖中国 GB 2760 使用范围。
- 普通配料词库继续标记为 internal_lexicon 或 unverified，等待官方标准、企业一手标签或可复核来源。
`;
  await writeFile(join(paths.docsDir, 'unverified-existing-data.md'), content);
}

export async function getOfficialDataDbStats(pool: pg.Pool) {
  const count = (table: string) => safeCount(pool, table);
  const [
    legacyIngredients,
    ingredientMaster,
    ingredientAliases,
    ingredientTags,
    ingredientRelations,
    allergenCategories,
    allergenAliases,
    allergenLabelingRules,
    ingredientAllergenRelations,
    digitalLabelRules,
    nutrientsCount,
    nutritionReferenceValues,
    nutritionClaimRules,
    nutritionPolyolEnergyRules,
    additiveUsageRules,
    nutritionFortifierRules,
    officialSources,
    ingredientImportStaging,
    importErrors
  ] = await Promise.all([
    count('ingredients'),
    count('ingredient_master'),
    count('ingredient_aliases'),
    count('ingredient_type_tags'),
    count('ingredient_relations'),
    count('allergen_categories'),
    count('allergen_aliases'),
    count('allergen_labeling_rules'),
    count('ingredient_allergen_relations'),
    count('digital_label_rules'),
    count('nutrients'),
    count('nutrition_reference_values'),
    count('nutrition_claim_rules'),
    count('nutrition_polyol_energy_rules'),
    count('additive_usage_rules'),
    count('nutrition_fortifier_rules'),
    count('official_sources'),
    count('ingredient_import_staging'),
    count('import_errors')
  ]);
  const ingredientTypes = await queryCounts(pool, 'ingredient_master', 'ingredient_type');
  const regulatoryStatuses = await queryCounts(pool, 'ingredient_master', 'regulatory_status');
  const sourceStatuses = await queryCounts(pool, 'official_sources', 'source_status');
  const recordsBySource = await queryCounts(pool, 'ingredient_source_relations', 'source_id');
  const pendingReviewIngredients = await countWhere(pool, 'ingredient_master', 'source_status', 'pending_review');
  const pendingReviewStaging = await countWhere(pool, 'ingredient_import_staging', 'review_status', 'pending_review');
  const unverifiedIngredients = await countWhere(pool, 'ingredient_master', 'source_status', 'unverified');
  const currentSourceRelations = await countWhere(pool, 'ingredient_source_relations', 'status', 'current');
  const aliasConflicts = (await queryAliasConflicts(pool)).length;
  const unlinkedStaging = await safeScalar(pool, `
    select count(*)::int
    from ingredient_import_staging s
    left join ingredient_master m
      on m.normalized_name = s.normalized_name
     and m.ingredient_type = s.ingredient_type
    where m.id is null
  `);
  const unlinkedActionableStaging = await safeScalar(pool, `
    select count(*)::int
    from ingredient_import_staging s
    left join ingredient_master m
      on m.normalized_name = s.normalized_name
     and m.ingredient_type = s.ingredient_type
    where m.id is null
      and s.record_type not in (
        'nutrition_reference_value',
        'nutrition_content_claim_rule',
        'nutrition_comparative_claim_rule',
        'nutrition_polyol_energy_rule',
        'allergen_category',
        'allergen_alias',
        'allergen_labeling_rule',
        'digital_label_rule'
      )
      and s.record_type not like 'label_rule_%'
      and s.record_type not like 'nutrition_label_rule_%'
      and s.record_type not like 'official_qa_%'
      and s.record_type not like 'official_notice_%'
  `);
  const ingredientRequiredFieldGaps = await safeScalar(pool, `
    select count(*)::int
    from ingredient_master
    where coalesce(id, '') = ''
       or coalesce(canonical_name, '') = ''
       or coalesce(normalized_name, '') = ''
       or coalesce(ingredient_type, '') = ''
       or coalesce(regulatory_status, '') = ''
       or coalesce(source_status, '') = ''
  `);
  const sourceRequiredFieldGaps = await safeScalar(pool, `
    select count(*)::int
    from official_sources
    where coalesce(id, '') = ''
       or coalesce(source_tier, '') = ''
       or coalesce(source_status, '') = ''
       or coalesce(source_org, '') = ''
       or coalesce(source_type, '') = ''
       or coalesce(title, '') = ''
       or coalesce(local_file_path, '') = ''
       or coalesce(content_hash, '') = ''
  `);
  const stagingSourceGaps = await safeScalar(pool, `
    select count(*)::int
    from ingredient_import_staging s
    left join official_sources os on os.id = s.source_id
    where os.id is null
  `);
  const sourceRelationGaps = await safeScalar(pool, `
    select count(*)::int
    from ingredient_source_relations sr
    left join ingredient_master m on m.id = sr.ingredient_id
    left join official_sources os on os.id = sr.source_id
    where m.id is null or os.id is null
  `);
  return {
    legacyIngredients,
    ingredientMaster,
    ingredientAliases,
    ingredientTags,
    ingredientRelations,
    allergenCategories,
    allergenAliases,
    allergenLabelingRules,
    ingredientAllergenRelations,
    digitalLabelRules,
    nutrients: nutrientsCount,
    nutritionReferenceValues,
    nutritionClaimRules,
    nutritionPolyolEnergyRules,
    additiveUsageRules,
    nutritionFortifierRules,
    officialSources,
    ingredientImportStaging,
    importErrors,
    ingredientTypes,
    regulatoryStatuses,
    sourceStatuses,
    recordsBySource,
    pendingReviewIngredients,
    pendingReviewStaging,
    unverifiedIngredients,
    currentSourceRelations,
    aliasConflicts,
    unlinkedStaging,
    unlinkedActionableStaging,
    ingredientRequiredFieldGaps,
    sourceRequiredFieldGaps,
    stagingSourceGaps,
    sourceRelationGaps
  };
}

function validateDbStats(stats: Awaited<ReturnType<typeof getOfficialDataDbStats>>) {
  const errors: string[] = [];
  if (stats.officialSources === 0) errors.push('official_sources is empty');
  if (stats.ingredientMaster === 0) errors.push('ingredient_master is empty');
  if (stats.ingredientImportStaging === 0) errors.push('ingredient_import_staging is empty');
  if (stats.ingredientRequiredFieldGaps > 0) errors.push(`ingredient_master required field gaps: ${stats.ingredientRequiredFieldGaps}`);
  if (stats.sourceRequiredFieldGaps > 0) errors.push(`official_sources required field gaps: ${stats.sourceRequiredFieldGaps}`);
  if (stats.stagingSourceGaps > 0) errors.push(`ingredient_import_staging rows without official_sources: ${stats.stagingSourceGaps}`);
  if (stats.sourceRelationGaps > 0) errors.push(`ingredient_source_relations rows without valid ingredient/source: ${stats.sourceRelationGaps}`);
  return errors;
}

async function queryAliasConflicts(pool: pg.Pool) {
  const result = await pool.query(`
    select normalized_alias, count(distinct ingredient_id)::int as count
    from ingredient_aliases
    where coalesce(match_policy, 'normal') <> 'candidate_only'
    group by normalized_alias
    having count(distinct ingredient_id) > 1
    order by count desc, normalized_alias
    limit 200
  `);
  return result.rows as Array<{ normalized_alias: string; count: number }>;
}

async function queryAliasConflictDetails(pool: pg.Pool) {
  const result = await pool.query(`
    select
      ia.normalized_alias as alias,
      array_agg(distinct m.id order by m.id) as ingredient_ids,
      array_agg(distinct m.canonical_name order by m.canonical_name) as canonical_names,
      array_agg(distinct m.ingredient_type order by m.ingredient_type) as ingredient_types,
      array_remove(array_agg(distinct coalesce(os.source_tier, '') order by coalesce(os.source_tier, '')), '') as source_tiers,
      array_remove(array_agg(distinct coalesce(os.title, '') order by coalesce(os.title, '')), '') as official_sources,
      array_remove(array_agg(distinct coalesce(sr.page_number::text, '') order by coalesce(sr.page_number::text, '')), '') as page_nos,
      array_remove(array_agg(distinct coalesce(sr.evidence_summary, '') order by coalesce(sr.evidence_summary, '')), '') as raw_texts
    from ingredient_aliases ia
    join ingredient_master m on m.id = ia.ingredient_id
    left join official_sources os on os.id = ia.source_id
    left join lateral (
      select page_number, evidence_summary
      from ingredient_source_relations sr
      where sr.ingredient_id = m.id
        and (sr.source_id = ia.source_id or ia.source_id is null)
      order by sr.page_number nulls last
      limit 1
    ) sr on true
    group by ia.normalized_alias
    having count(distinct ia.ingredient_id) > 1
    order by count(distinct ia.ingredient_id) desc, ia.normalized_alias
  `);
  return result.rows.map((row) => ({
    alias: String(row.alias || ''),
    ingredient_ids: readPgTextArray(row.ingredient_ids),
    canonical_names: readPgTextArray(row.canonical_names),
    ingredient_types: readPgTextArray(row.ingredient_types),
    source_tiers: readPgTextArray(row.source_tiers),
    official_sources: readPgTextArray(row.official_sources),
    page_nos: readPgTextArray(row.page_nos),
    raw_texts: readPgTextArray(row.raw_texts).map((item) => item.slice(0, 300)),
    conflict_reason: '同一 normalized_alias 指向多个 ingredient_master，自动 exact match 可能误连。',
    suggested_action: '已标记 alias_confidence=ambiguous、match_policy=candidate_only；人工核验后再决定合并、保留多义或拆分 alias。'
  }));
}

async function queryRows(pool: pg.Pool, sqlText: string) {
  try {
    const result = await pool.query(sqlText);
    return result.rows as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

function classifyUnlinkedStaging(row: Record<string, unknown>) {
  const recordType = String(row.record_type || '');
  const specialPrefixes = [
    'label_rule_',
    'nutrition_label_rule_',
    'official_qa_',
    'official_notice_'
  ];
  const specialExact = new Set([
    'nutrition_reference_value',
    'nutrition_comparative_claim_rule',
    'nutrition_polyol_energy_rule',
    'allergen_category',
    'allergen_alias',
    'allergen_labeling_rule',
    'digital_label_rule'
  ]);
  if (specialExact.has(recordType) || specialPrefixes.some((prefix) => recordType.startsWith(prefix))) {
    return {
      reason: `${recordType} 是规则、营养或公告专用记录，不应强制链接 ingredient_master。`,
      action: '已写入或等待写入对应专用表；保持 pending_review，不提升为正式 ingredient。',
      autoLinkable: false,
      needsManualCheck: false,
      specialTableRecord: true
    };
  }
  if (['food_additive_new_variety', 'nutrition_fortifier_new_variety', 'novel_food_ingredient', 'food_microorganism', 'food_medicine_substance'].includes(recordType)) {
    return {
      reason: '未找到 normalized_name + ingredient_type 的 ingredient_master 匹配；可能是解析名称、版本或类型待复核。',
      action: 'needs_manual_check；人工确认规范名称后再链接或新增 alias，不删除 staging。',
      autoLinkable: false,
      needsManualCheck: true,
      specialTableRecord: false
    };
  }
  return {
    reason: '未找到可靠 exact normalized match，自动链接风险较高。',
    action: 'needs_manual_check；保留原始 staging 和 evidence，后续人工核验。',
    autoLinkable: false,
    needsManualCheck: true,
    specialTableRecord: false
  };
}

function readPgTextArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || '')).filter(Boolean) : [];
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function escapeMarkdownTable(value: string) {
  return normalizeSpaces(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')
    .slice(0, 1200);
}

async function safeCount(pool: pg.Pool, table: string) {
  return safeScalar(pool, `select count(*)::int from ${table}`);
}

async function safeScalar(pool: pg.Pool, sqlText: string) {
  try {
    const result = await pool.query(sqlText);
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

async function countWhere(pool: pg.Pool, table: string, column: string, value: string) {
  try {
    const result = await pool.query(`select count(*)::int from ${table} where ${column} = $1`, [value]);
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

async function queryCounts(pool: pg.Pool, table: string, column: string) {
  try {
    const result = await pool.query(`select ${column} as key, count(*)::int as count from ${table} group by ${column} order by ${column}`);
    return Object.fromEntries(result.rows.map((row) => [String(row.key || 'unknown'), Number(row.count)]));
  } catch {
    return {};
  }
}

async function createLocalClient() {
  const config = getConfig();
  assertLocalDatabaseUrl(config.databaseUrl);
  return createDatabaseClient(config.databaseUrl);
}

async function ensureDirs() {
  const paths = getPipelinePaths();
  for (const dir of [
    paths.downloadedDir,
    paths.dataDir,
    paths.rawDir,
    paths.manifestsDir,
    paths.extractedDir,
    paths.stagingDir,
    paths.reportsDir,
    paths.failedDir,
    paths.checksumsDir
  ]) {
    await mkdir(dir, { recursive: true });
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function renderSourcesYaml(sources: SourceManifestItem[]) {
  return sources.map((source) => [
    `- source_id: ${source.source_id}`,
    `  source_tier: ${source.source_tier}`,
    `  source_status: ${source.source_status}`,
    `  source_type: ${source.source_type}`,
    `  title: ${quoteYaml(source.title)}`,
    `  standard_no: ${quoteYaml(source.standard_no)}`,
    `  announcement_no: ${quoteYaml(source.announcement_no)}`,
    `  source_org: ${quoteYaml(source.source_org)}`,
    `  official_page_url: ${quoteYaml(source.official_page_url)}`,
    `  attachment_url: ${quoteYaml(source.attachment_url)}`,
    `  original_source_url: ${quoteYaml(source.original_source_url)}`,
    `  local_file_path: ${quoteYaml(source.local_file_path)}`,
    `  sha256: ${source.sha256}`,
    `  publication_date: ${quoteYaml(source.publication_date)}`,
    `  effective_date: ${quoteYaml(source.effective_date)}`,
    `  retrieved_at: ${quoteYaml(source.retrieved_at)}`,
    `  source_version: ${quoteYaml(source.source_version)}`,
    `  license: ${quoteYaml(source.license)}`,
    `  parser_name: ${parserName}`,
    `  parser_version: ${parserVersion}`,
    `  parse_status: ${source.parse_status}`,
    `  verification_status: ${quoteYaml(source.verification_status)}`,
    `  confidence_score: ${source.confidence_score}`,
    `  notes: ${quoteYaml(source.notes)}`
  ].join('\n')).join('\n');
}

function quoteYaml(value: string) {
  return JSON.stringify(value || '');
}

function printSnapshotSummary(snapshot: PipelineSnapshot) {
  console.log(JSON.stringify({
    sources: snapshot.sources.length,
    stagingRecords: snapshot.staging_records.length,
    duplicates: snapshot.duplicates.length,
    failed: snapshot.failed.length,
    manualDownloads: snapshot.manual_downloads.length,
    stagingByType: countBy(snapshot.staging_records, (row) => row.record_type)
  }, null, 2));
}

function dedupeRecords(records: StagingRecord[]) {
  const byKey = new Map<string, StagingRecord>();
  for (const record of records) {
    byKey.set(`${record.source_id}|${record.record_type}|${record.normalized_name}|${record.row_reference}`, record);
  }
  return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function findEvidenceExcerpt(
  text: string,
  terms: string[],
  options: { maxLines?: number; htmlText?: boolean } = {}
) {
  const pages = options.htmlText ? [text] : splitPages(text);
  const maxLines = options.maxLines ?? 10;
  for (const [pageIndex, pageText] of pages.entries()) {
    const lines = pageText.split('\n').map((line) => normalizeSpaces(line)).filter(Boolean);
    for (const term of terms) {
      const normalizedTerm = normalizeSpaces(term);
      const index = lines.findIndex((line) => line.includes(normalizedTerm));
      if (index < 0) continue;
      const start = Math.max(0, index - 2);
      const end = Math.min(lines.length, index + maxLines);
      return {
        pageNumber: options.htmlText ? null : pageIndex + 1,
        text: lines.slice(start, end).join('\n')
      };
    }
  }
  return null;
}

function findAppendixC1Evidence(text: string, terms: string[], options: { maxLines?: number } = {}) {
  const pages = splitPages(text);
  const maxLines = options.maxLines ?? 10;
  for (const [pageIndex, pageText] of pages.entries()) {
    const lines = pageText.split('\n').map((line) => normalizeSpaces(line)).filter(Boolean);
    const looksLikeAppendixC1 = lines.some((line) => (
      (line.includes('表 C.') || line.includes('表 C.1'))
      && line.includes('能量和营养成分含量声称')
    )) || lines.some((line) => line.includes('能量和营养成分含量声称的要求和限制性条件'));
    if (!looksLikeAppendixC1) continue;
    for (const term of terms) {
      const normalizedTerm = normalizeSpaces(term);
      const index = lines.findIndex((line) => line.includes(normalizedTerm));
      if (index < 0) continue;
      const start = Math.max(0, index - 3);
      const end = Math.min(lines.length, index + maxLines);
      return {
        pageNumber: pageIndex + 1,
        text: lines.slice(start, end).join('\n')
      };
    }
  }
  return null;
}

function htmlToText(value: string) {
  return decodeHtmlEntities(extractHtmlText(value))
    .split('\n')
    .map((line) => normalizeSpaces(line))
    .filter(Boolean)
    .join('\n');
}

const blockHtmlTags = new Set(['p', 'div', 'h1', 'h2', 'h3', 'li', 'tr']);

function extractHtmlText(value: string) {
  let output = '';
  let index = 0;
  while (index < value.length) {
    if (value[index] !== '<') {
      output += value[index];
      index += 1;
      continue;
    }

    const tagEnd = value.indexOf('>', index + 1);
    if (tagEnd < 0) {
      output += value[index];
      index += 1;
      continue;
    }

    const tagContent = value.slice(index + 1, tagEnd).trim();
    const tagName = getHtmlTagName(tagContent);
    const closing = tagContent.startsWith('/');
    if (!closing && (tagName === 'script' || tagName === 'style')) {
      index = findHtmlClosingTagEnd(value, tagEnd + 1, tagName);
      output += '\n';
      continue;
    }
    if (tagName === 'br' || (closing && blockHtmlTags.has(tagName))) {
      output += '\n';
    } else {
      output += ' ';
    }
    index = tagEnd + 1;
  }
  return output;
}

function getHtmlTagName(tagContent: string) {
  const trimmed = tagContent.startsWith('/') ? tagContent.slice(1).trimStart() : tagContent;
  const match = /^[A-Za-z][A-Za-z0-9:-]*/u.exec(trimmed);
  return match ? match[0].toLowerCase() : '';
}

function findHtmlClosingTagEnd(value: string, start: number, tagName: string) {
  let index = start;
  while (index < value.length) {
    const nextTag = value.indexOf('<', index);
    if (nextTag < 0) return value.length;
    const tagEnd = value.indexOf('>', nextTag + 1);
    if (tagEnd < 0) return value.length;
    const tagContent = value.slice(nextTag + 1, tagEnd).trim();
    if (tagContent.startsWith('/') && getHtmlTagName(tagContent) === tagName) return tagEnd + 1;
    index = tagEnd + 1;
  }
  return value.length;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/giu, ' ')
    .replace(/&#39;/gu, "'")
    .replace(/&quot;/giu, '"')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&amp;/giu, '&');
}

function splitPages(text: string) {
  return text.split('\f');
}

function parseUseLevel(level: string) {
  const unitMatch = level.match(/(mg|μg|g|％|%)\/kg|%|％/u);
  const values = [...level.matchAll(/\d+(?:\.\d+)?/gu)].map((match) => match[0]);
  return {
    min: level.includes('~') && values[0] ? values[0] : '',
    max: values[values.length - 1] || level,
    unit: unitMatch?.[0] || ''
  };
}

function cleanupCatalogName(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/（\s*/g, '（')
    .replace(/\s*）/g, '）')
    .trim();
}

function isValidCatalogName(value: string) {
  if (!value || value.length > 80) return false;
  return !/(适用标准|食品安全指标|执行|参照|^GB\s*\d|公告$|≤|CFU|MPN|来源：|供体：|^flexus|^\d+$)/u.test(value);
}

function isLikelyNutrientName(value: string) {
  if (value.endsWith('类')) return false;
  return /^(维生素|β-|烟酸|叶酸|泛酸|生物素|胆碱|肌醇|铁|钙|锌|硒|镁|铜|锰|钾|磷|L-|牛磺酸|左旋肉碱|γ-|叶黄素|低聚果糖|1,3-|花生四烯酸|二十二碳六烯酸|乳铁蛋白|酪蛋白)/u.test(value);
}

function normalizeNutrientName(value: string) {
  if (value === '左旋肉碱（L-肉') return '左旋肉碱（L-肉碱）';
  return value;
}

function normalizeName(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[（]/gu, '(')
    .replace(/[）]/gu, ')')
    .replace(/\s+/gu, '')
    .replace(/[·•・]/gu, '')
    .replace(/[，、,;；:：]/gu, '');
}

function normalizeSpaces(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizePath(value: string) {
  return value.split('\\').join('/');
}

function slugify(value: string) {
  return normalizeName(value).replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-').replace(/^-|-$/g, '') || 'source';
}

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function summarizeEvidence(value: string) {
  return normalizeSpaces(value).slice(0, 500);
}

function findEvidenceLine(text: string, name: string) {
  return text.split('\n').map((line) => normalizeSpaces(line)).find((line) => line.includes(name)) || name;
}

function readStringList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function getAliasLanguage(value: string) {
  return /[\u4e00-\u9fa5]/u.test(value) ? 'zh' : /^[A-Za-z0-9\s().'-]+$/u.test(value) ? 'en' : 'und';
}

function countBy<T>(items: T[], readKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = readKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function renderCountTable(counts: Record<string, number>, label: string) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return `| ${label} | 数量 |\n|---|---:|\n| none | 0 |`;
  return `| ${label} | 数量 |\n|---|---:|\n${entries.map(([key, count]) => `| ${key} | ${count} |`).join('\n')}`;
}

function getRepoRoot() {
  const cwd = resolve(process.cwd());
  return basename(cwd) === 'backend' ? resolve(cwd, '..') : cwd;
}

const allergenDefinitions = [
  {
    code: 'gluten_cereals',
    name: '含麸质谷物及其制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['小麦', '黑麦', '大麦', '燕麦', '斯佩耳特小麦']
  },
  {
    code: 'crustacean',
    name: '甲壳纲类动物及其制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['虾', '龙虾', '蟹']
  },
  {
    code: 'fish',
    name: '鱼类及其制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['鱼', '鱼粉', '鱼明胶']
  },
  {
    code: 'egg',
    name: '蛋类及其制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['鸡蛋', '蛋黄', '蛋白', '蛋粉']
  },
  {
    code: 'peanut',
    name: '花生及其制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['花生', '花生酱', '花生粉']
  },
  {
    code: 'soybean',
    name: '大豆及其制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['大豆', '黄豆', '大豆蛋白']
  },
  {
    code: 'milk',
    name: '乳及乳制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一，包括乳糖。',
    aliases: ['牛奶', '乳粉', '乳清粉', '乳糖', '酪蛋白']
  },
  {
    code: 'tree_nuts',
    name: '坚果及其果仁类制品',
    description: 'GB 7718-2025 4.12 列明的八大类致敏物质之一。',
    aliases: ['坚果', '杏仁', '腰果', '榛子', '核桃', '开心果']
  }
];

const foodMedicineNineRows = [
  { name: '党参', botanicalName: '党参；素花党参；川党参', latinNames: ['Codonopsis pilosula (Franch.) Nannf.', 'Codonopsis pilosula Nannf. var. modesta (Nannf.) L.T. Shen', 'Codonopsis tangshen Oliv.'], familyName: '桔梗科', ediblePart: '根', usageRestrictions: '安全限量值按目录执行' },
  { name: '肉苁蓉', botanicalName: '肉苁蓉', latinNames: ['Cistanche deserticola Y. C. Ma'], familyName: '列当科', ediblePart: '肉质茎', usageRestrictions: '荒漠肉苁蓉；安全限量值按目录执行' },
  { name: '铁皮石斛', botanicalName: '铁皮石斛', latinNames: ['Dendrobium officinale Kimura et Migo'], familyName: '兰科', ediblePart: '茎', usageRestrictions: '安全限量值按目录执行' },
  { name: '西洋参', botanicalName: '西洋参', latinNames: ['Panax quinquefolium L.'], familyName: '五加科', ediblePart: '根', usageRestrictions: '安全限量值按目录执行' },
  { name: '黄芪', botanicalName: '蒙古黄芪；膜荚黄芪', latinNames: ['Astragalus membranaceus (Fisch.) Bge.var. mongholicus (Bge.) Hsiao', 'Astragalus membranaceus (Fisch.) Bge.'], familyName: '豆科', ediblePart: '根', usageRestrictions: '安全限量值按目录执行' },
  { name: '灵芝', botanicalName: '赤芝；紫芝', latinNames: ['Ganoderma lucidum（Leyss. ex Fr.）Karst.', 'Ganoderma sinense Zhao, Xu et Zhang'], familyName: '多孔菌科', ediblePart: '子实体', usageRestrictions: '安全限量值按目录执行' },
  { name: '山茱萸', botanicalName: '山茱萸', latinNames: ['Cornus officinalis Sieb.et Zucc.'], familyName: '山茱萸科', ediblePart: '果实', usageRestrictions: '安全限量值按目录执行' },
  { name: '天麻', botanicalName: '天麻', latinNames: ['Gastrodia elata Bl.'], familyName: '兰科', ediblePart: '块茎', usageRestrictions: '安全限量值按目录执行' },
  { name: '杜仲叶', botanicalName: '杜仲', latinNames: ['Eucommia ulmoides Oliv.'], familyName: '杜仲科', ediblePart: '叶', usageRestrictions: '安全限量值按目录执行' }
];

const foodMedicineFourRows = [
  { name: '地黄', botanicalName: '地黄', latinNames: ['Rehmannia glutinosa Libosch.'], familyName: '玄参科', ediblePart: '块根', usageRestrictions: '安全限量值按目录执行' },
  { name: '麦冬', botanicalName: '麦冬', latinNames: ['Ophiopogon japonicus（L.f）Ker-Gawl.'], familyName: '百合科', ediblePart: '块根', usageRestrictions: '安全限量值按目录执行' },
  { name: '天冬', botanicalName: '天冬', latinNames: ['Asparagus cochinchinensis (Lour.) Merr.'], familyName: '百合科', ediblePart: '块根', usageRestrictions: '安全限量值按目录执行' },
  { name: '化橘红', botanicalName: '化州柚；柚', latinNames: ['Citrus grandis‘Tomentosa’', 'Citrus grandis（L.）Osbeck'], familyName: '芸香科', ediblePart: '外层果皮', usageRestrictions: '安全限量值按目录执行' }
];

const infantMicroorganismRows = [
  { no: 1, updatedName: '嗜酸乳杆菌', strain: 'NCFM', updatedLatinName: 'Lactobacillus acidophilus NCFM', previousName: '嗜酸乳杆菌', previousLatinName: 'Lactobacillus acidophilus NCFM', ageRestrictions: '仅限用于1岁以上幼儿的食品' },
  { no: 2, updatedName: '动物双歧杆菌乳亚种', strain: 'Bb-12', updatedLatinName: 'Bifidobacterium animalis subsp. lactis Bb-12', previousName: '动物双歧杆菌', previousLatinName: 'Bifidobacterium animalis Bb-12', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 3, updatedName: '动物双歧杆菌乳亚种', strain: 'HN019', updatedLatinName: 'Bifidobacterium animalis subsp. lactis HN019', previousName: '乳双歧杆菌', previousLatinName: 'Bifidobacterium lactis HN019', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 4, updatedName: '动物双歧杆菌乳亚种', strain: 'Bi-07', updatedLatinName: 'Bifidobacterium animalis subsp. lactis Bi-07', previousName: '乳双歧杆菌', previousLatinName: 'Bifidobacterium lactis Bi-07', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 5, updatedName: '鼠李糖乳酪杆菌', strain: 'GG', updatedLatinName: 'Lacticaseibacillus rhamnosus GG', previousName: '鼠李糖乳杆菌', previousLatinName: 'Lactobacillus rhamnosus LGG', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 6, updatedName: '鼠李糖乳酪杆菌', strain: 'HN001', updatedLatinName: 'Lacticaseibacillus rhamnosus HN001', previousName: '鼠李糖乳杆菌', previousLatinName: 'Lactobacillus rhamnosus HN001', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 7, updatedName: '鼠李糖乳酪杆菌', strain: 'MP108', updatedLatinName: 'Lacticaseibacillus rhamnosus MP108', previousName: '鼠李糖乳杆菌', previousLatinName: 'Lactobacillus rhamnosus MP108', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 8, updatedName: '罗伊氏粘液乳杆菌', strain: 'DSM17938', updatedLatinName: 'Limosilactobacillus reuteri DSM 17938', previousName: '罗伊氏乳杆菌', previousLatinName: 'Lactobacillus reuteri DSM17938', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 9, updatedName: '发酵粘液乳杆菌', strain: 'CECT5716', updatedLatinName: 'Limosilactobacillus fermentum CECT5716', previousName: '发酵乳杆菌', previousLatinName: 'Lactobacillus fermentum CECT5716', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 10, updatedName: '短双歧杆菌', strain: 'M-16V', updatedLatinName: 'Bifidobacterium breve M-16V', previousName: '短双歧杆菌', previousLatinName: 'Bifidobacterium breve M-16V', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 11, updatedName: '瑞士乳杆菌', strain: 'R0052', updatedLatinName: 'Lactobacillus helveticus R0052', previousName: '瑞士乳杆菌', previousLatinName: 'Lactobacillus helveticus R0052', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 12, updatedName: '长双歧杆菌婴儿亚种', strain: 'R0033', updatedLatinName: 'Bifidobacterium longum subsp. infantis R0033', previousName: '婴儿双歧杆菌', previousLatinName: 'Bifidobacterium infantis R0033', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 13, updatedName: '两歧双歧杆菌', strain: 'R0071', updatedLatinName: 'Bifidobacterium bifidum R0071', previousName: '两歧双歧杆菌', previousLatinName: 'Bifidobacterium bifidum R0071', ageRestrictions: '婴幼儿食品适用范围待人工复核' },
  { no: 14, updatedName: '长双歧杆菌长亚种', strain: 'BB536', updatedLatinName: 'Bifidobacterium longum subsp. longum BB536', previousName: '长双歧杆菌长亚种', previousLatinName: 'Bifidobacterium longum subsp. longum BB536', ageRestrictions: '婴幼儿食品适用范围待人工复核' }
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const phase = process.argv[2] || 'inventory';
  runPipelinePhase(phase).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
