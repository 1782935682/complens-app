import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  buildIngredientKnowledgeDataset,
  normalizeIngredientName,
  parseOfficialName,
  validateIngredientKnowledgeDataset,
  type Gb2760KnowledgeSourceMetadata
} from '../src/services/ingredientKnowledgeService.js';
import { buildPipelineSnapshot } from '../scripts/ingredient-official-data-pipeline.js';
import type { FoodAdditiveInput, Gb2760OfficialRecordInput, Gb2760OfficialReferenceRowInput } from '../src/services/ingredientService.js';

const source: Gb2760KnowledgeSourceMetadata = {
  sourceName: '国家卫生健康委公告（2024年第1号）/ 食品安全国家标准数据检索平台',
  sourceType: 'official_standard',
  sourceUrl: 'https://sppt.cfsa.net.cn:8086/db?task=indexSearch',
  standardCode: 'GB 2760-2024',
  standardTitle: '食品安全国家标准 食品添加剂使用标准',
  publishedAt: '2024-02-08',
  effectiveDate: '2025-02-08',
  retrievedAt: '2026-06-12',
  platformRecordId: '6CA1489A-9570-4906-8CE8-CC86FBFB1941',
  announcementRecordId: '3D0601E8-A77C-4EC5-B148-30E2E7020822',
  fileGuid: '43C9B75E-3D84-4577-80FC-0F7D77D36407',
  factName: '1747898473246.pdf',
  pdfSha256: '2a2c4a867cf5551177e5e65bf8140e9f85a0616d96aa3353161869e07a8505de'
};

describe('ingredient knowledge migration', () => {
  it('creates only ingredient knowledge tables in migration 0018', async () => {
    const migrationPath = fileURLToPath(new URL('../src/db/migrations/0018_narrow_zombie.sql', import.meta.url));
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE "ingredient_master"');
    expect(sql).toContain('CREATE TABLE "official_sources"');
    expect(sql).toContain('CREATE TABLE "ingredient_regulatory_rules"');
    expect(sql).not.toContain('CREATE TABLE "label_scan_sessions"');
    expect(sql).not.toContain('CREATE TABLE "label_scan_images"');
  });

  it('adds source coverage tables without destructive SQL in migration 0019', async () => {
    const migrationPath = fileURLToPath(new URL('../src/db/migrations/0019_ingredient_source_coverage.sql', import.meta.url));
    const sql = await readFile(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "ingredient_import_staging"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "nutrition_fortifier_rules"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "food_medicine_rules"');
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });
});

describe('official source-materials pipeline', () => {
  it('scans only source-materials and builds checksum inventory', async () => {
    const snapshot = await buildPipelineSnapshot({ extract: false });

    expect(snapshot.sources.length).toBeGreaterThanOrEqual(7);
    expect(snapshot.sources.every((source) => source.local_file_path.startsWith('docs/source-materials/'))).toBe(true);
    expect(snapshot.sources.some((source) => source.local_file_path.startsWith('docs/official'))).toBe(false);
    expect(snapshot.sources.find((source) => source.standard_no === 'GB 2760-2024')?.sha256).toBe(source.pdfSha256);
    expect(snapshot.duplicates).toEqual([]);
  });

  it('does not treat source-materials download cache files as inventory sources', async () => {
    const downloadedDir = fileURLToPath(new URL('../../docs/source-materials/downloaded/', import.meta.url));
    const cachedFile = fileURLToPath(new URL('../../docs/source-materials/downloaded/codex-test-cache.pdf', import.meta.url));
    await mkdir(downloadedDir, { recursive: true });
    await writeFile(cachedFile, 'temporary cache file for source scan test');
    try {
      const snapshot = await buildPipelineSnapshot({ extract: false });

      expect(snapshot.sources.some((source) => source.local_file_path.includes('/downloaded/'))).toBe(false);
      expect(snapshot.sources.some((source) => source.local_file_path.endsWith('codex-test-cache.pdf'))).toBe(false);
    } finally {
      await unlink(cachedFile).catch(() => undefined);
    }
  });

  it('records a single PDF extraction failure without aborting the source batch', async () => {
    const corruptPdf = fileURLToPath(new URL('../../docs/source-materials/codex-test-corrupt.pdf', import.meta.url));
    await writeFile(corruptPdf, 'not a valid pdf');
    try {
      const snapshot = await buildPipelineSnapshot({ extract: true });
      const failedSource = snapshot.failed.find((item) => item.local_file_path.endsWith('codex-test-corrupt.pdf'));
      const manifestSource = snapshot.sources.find((item) => item.local_file_path.endsWith('codex-test-corrupt.pdf'));

      expect(failedSource).toMatchObject({
        stage: 'extract',
        local_file_path: 'docs/source-materials/codex-test-corrupt.pdf'
      });
      expect(failedSource?.reason).toContain('pdftotext');
      expect(failedSource?.reason).toMatch(/failed|command not found/);
      expect(manifestSource?.parse_status).toBe('failed_extract');
      expect(snapshot.staging_records.length).toBeGreaterThan(300);
    } finally {
      await unlink(corruptPdf).catch(() => undefined);
    }
  });

  it('extracts local official PDFs into typed pending-review staging records', async () => {
    const snapshot = await buildPipelineSnapshot({ extract: true });
    const byType = new Map<string, number>();
    for (const record of snapshot.staging_records) {
      byType.set(record.record_type, (byType.get(record.record_type) || 0) + 1);
    }

    expect(byType.get('nutrition_fortifier_rule')).toBeGreaterThan(20);
    expect(byType.get('novel_food_ingredient')).toBeGreaterThan(50);
    expect(byType.get('food_medicine_substance')).toBe(13);
    const infantMicroorganisms = snapshot.staging_records.filter((record) =>
      record.source_id.includes('food-microorganism-infant')
    );

    expect(byType.get('food_microorganism')).toBe(40);
    const nrvRows = snapshot.staging_records.filter((record) => record.record_type === 'nutrition_reference_value');
    expect(nrvRows).toHaveLength(32);
    expect(nrvRows.every((record) => hasNrvSourceEvidence(record))).toBe(true);
    expect(infantMicroorganisms).toHaveLength(14);
    expect(infantMicroorganisms.every((record) => record.review_status === 'pending_review')).toBe(true);
    expect(infantMicroorganisms.every((record) =>
      Array.isArray(record.parsed_data.ocrEvidenceFiles) &&
      record.parsed_data.ocrEvidenceFiles.includes('data/official_sources/raw/infant-microorganism-page-1-ocr.json')
    )).toBe(true);
    expect(snapshot.staging_records.every((record) => record.review_status === 'pending_review')).toBe(true);
    expect(snapshot.failed).toEqual([]);
  });
});

describe('ingredient knowledge dataset builder', () => {
  it('keeps old ingredient ids compatible while adding official source relations', () => {
    const dataset = buildIngredientKnowledgeDataset({
      foodIngredients: [createFoodIngredient({ dataStatus: 'verified_regulation', sourceScope: 'gb_2760_regulation', isVerified: true })],
      gb2760Records: [createA1Record({ reviewStatus: 'verified' })],
      gb2760ReferenceRows: [],
      gb2760Source: source
    });

    const master = dataset.ingredients.find((row) => row.id === 'ik-citric-acid');
    expect(master).toMatchObject({
      legacyIngredientId: 'citric-acid',
      ingredientType: 'food_additive',
      sourceStatus: 'official'
    });
    expect(dataset.sourceRelations.some((row) => row.ingredientId === 'ik-citric-acid' && row.sourceId === dataset.officialSources[0].id)).toBe(true);
    expect(validateIngredientKnowledgeDataset(dataset)).toEqual([]);
  });

  it('marks old non-official data without fabricating official sources', () => {
    const dataset = buildIngredientKnowledgeDataset({
      foodIngredients: [
        createFoodIngredient({
          id: 'legacy-additive',
          nameCn: '旧添加剂',
          dataStatus: 'unverified',
          sourceScope: 'seed_reference',
          isVerified: false
        })
      ],
      gb2760Records: [],
      gb2760ReferenceRows: [],
      gb2760Source: source
    });

    expect(dataset.ingredients[0]).toMatchObject({
      id: 'ik-legacy-additive',
      sourceStatus: 'unverified',
      regulatoryStatus: 'unverified'
    });
    expect(dataset.aliases.every((alias) => alias.sourceStatus !== 'official')).toBe(true);
    expect(dataset.sourceRelations).toHaveLength(0);
  });

  it('normalizes official aliases and keeps format variants separate from official aliases', () => {
    expect(parseOfficialName('黄原胶（又名汉生胶）')).toEqual({
      canonicalName: '黄原胶',
      officialAliases: ['汉生胶']
    });
    expect(normalizeIngredientName('食品添加剂（黄 原 胶）')).toBe('(黄原胶)');
  });

  it('keeps repeated builds idempotent and stable', () => {
    const input = {
      foodIngredients: [createFoodIngredient({})],
      gb2760Records: [createA1Record({ reviewStatus: 'needs_review' })],
      gb2760ReferenceRows: [createReferenceRow({})],
      gb2760Source: source
    };
    const first = buildIngredientKnowledgeDataset(input);
    const second = buildIngredientKnowledgeDataset(input);

    expect(first.ingredients.map((row) => row.id)).toEqual(second.ingredients.map((row) => row.id));
    expect(first.aliases.map((row) => row.id)).toEqual(second.aliases.map((row) => row.id));
    expect(first.regulatoryRules.map((row) => row.id)).toEqual(second.regulatoryRules.map((row) => row.id));
  });

  it('uses formal rule source ids to mark current rules without changing API-facing seed data', () => {
    const dataset = buildIngredientKnowledgeDataset({
      foodIngredients: [createFoodIngredient({ dataStatus: 'unverified', sourceScope: 'seed_reference', isVerified: false })],
      gb2760Records: [createA1Record({ reviewStatus: 'needs_review' })],
      gb2760ReferenceRows: [],
      gb2760Source: source,
      formalRuleSourceIds: new Set(['gb2760-2024-a1-citric-acid-general'])
    });

    expect(dataset.regulatoryRules[0]).toMatchObject({
      status: 'current',
      maxUseLevel: '按生产需要适量使用',
      unit: null,
      usePrinciple: '按生产需要适量使用'
    });
    expect(dataset.ingredients.find((row) => row.id === 'ik-citric-acid')?.sourceStatus).toBe('official');
  });

  it('reports official alias conflicts instead of resolving them automatically', () => {
    const dataset = buildIngredientKnowledgeDataset({
      foodIngredients: [],
      gb2760Records: [
        createA1Record({ id: 'row-1', ingredientId: '', additiveNameCn: '测试一', insNumber: '999' }),
        createA1Record({ id: 'row-2', ingredientId: '', additiveNameCn: '测试二', insNumber: '999' })
      ],
      gb2760ReferenceRows: [],
      gb2760Source: source
    });

    expect(dataset.conflictReport).toContainEqual({
      type: 'official_alias_conflict',
      key: 'ins999',
      ids: expect.arrayContaining([
        expect.stringContaining('ik-gb2760-a1-')
      ])
    });
  });
});

function createFoodIngredient(overrides: Partial<FoodAdditiveInput>): FoodAdditiveInput {
  return {
    id: 'citric-acid',
    kind: 'food-additive',
    dataCategory: 'food',
    nameCn: '柠檬酸',
    nameEn: 'Citric acid',
    aliases: ['INS 330', 'E330'],
    category: '酸度调节剂',
    functions: ['酸度调节剂'],
    description: '测试食品添加剂。',
    riskLevel: 'unknown',
    suitableFor: [],
    cautionFor: [],
    sourceNote: '测试来源。',
    sourceReferences: [],
    reviewStatus: 'draft',
    dataStatus: 'unverified',
    dataVersion: 'test',
    updatedAt: '2026-06-18',
    sourceName: '测试来源',
    sourceType: 'official_standard',
    sourceScope: 'seed_reference',
    sourceVersion: 'test',
    sourceUrl: 'https://example.test/source',
    effectiveDate: '2025-02-08',
    confidenceLevel: 'unverified',
    matchConfidence: 'low',
    lastReviewedAt: '2026-06-18',
    reviewNote: '测试',
    regulatoryBasis: '测试依据',
    rawSourceText: '测试原文',
    isVerified: false,
    gbCode: 'INS 330',
    gbStatus: 'unknown',
    usageLimits: [],
    foodCategories: [],
    allergenTypes: [],
    cautionGroups: [],
    ...overrides
  };
}

function hasNrvSourceEvidence(record: { canonical_name: string; raw_source_text: string; parsed_data: Record<string, unknown> }) {
  const compactEvidence = compactNrvEvidence(record.raw_source_text);
  const compactName = compactNrvEvidence(record.canonical_name);
  const compactValue = compactNrvEvidence(String(record.parsed_data.value || ''));
  const unitTokens = compactNrvEvidence(String(record.parsed_data.unit || '')).split('或').filter(Boolean);
  return compactEvidence.includes(compactName)
    && compactEvidence.includes(compactValue)
    && unitTokens.some((unit) => compactEvidence.includes(unit));
}

function compactNrvEvidence(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '');
}

function createA1Record(overrides: Partial<Gb2760OfficialRecordInput>): Gb2760OfficialRecordInput {
  return {
    id: 'gb2760-2024-a1-citric-acid-general',
    ingredientId: 'citric-acid',
    standardCode: 'GB 2760-2024',
    standardTitle: '食品安全国家标准 食品添加剂使用标准',
    tableName: '表 A.1',
    additiveNameCn: '柠檬酸（又名枸橼酸）',
    additiveNameEn: 'citric acid',
    cnsNumber: '01.101',
    insNumber: '330',
    functionText: '酸度调节剂、抗氧化剂',
    foodCategoryCode: '—',
    foodCategoryName: '各类食品',
    maxUseLevel: '按生产需要适量使用',
    unit: '',
    note: '',
    pdfPage: 89,
    standardPage: 68,
    rawSourceText: 'GB 2760-2024 表 A.1：柠檬酸（又名枸橼酸）；按生产需要适量使用。',
    sourceName: source.sourceName,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    downloadEndpoint: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    platformRecordId: source.platformRecordId,
    announcementRecordId: source.announcementRecordId,
    fileGuid: source.fileGuid,
    factName: source.factName,
    pdfSha256: source.pdfSha256,
    retrievedAt: source.retrievedAt,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    ...overrides
  };
}

function createReferenceRow(overrides: Partial<Gb2760OfficialReferenceRowInput>): Gb2760OfficialReferenceRowInput {
  return {
    id: 'gb2760-2024-c3-enzyme-preparation-001',
    standardCode: 'GB 2760-2024',
    standardTitle: '食品安全国家标准 食品添加剂使用标准',
    tableName: '表 C.3',
    tableTitle: '食品用酶制剂及其来源名单',
    rowNumber: 1,
    rowCode: '1',
    rowName: 'α-半乳糖苷酶 Alpha-galactosidase',
    rowData: {
      enzymeName: 'α-半乳糖苷酶 Alpha-galactosidase',
      source: '黑曲霉 Aspergillus niger'
    },
    pdfPage: 233,
    standardPage: 230,
    rawSourceText: 'GB 2760-2024 表 C.3：酶 α-半乳糖苷酶；来源 黑曲霉 Aspergillus niger。',
    sourceName: source.sourceName,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    downloadEndpoint: 'https://sppt.cfsa.net.cn:8086/cfsa_aiguo',
    platformRecordId: source.platformRecordId,
    announcementRecordId: source.announcementRecordId,
    fileGuid: source.fileGuid,
    factName: source.factName,
    pdfSha256: source.pdfSha256,
    retrievedAt: source.retrievedAt,
    extractionTool: 'test',
    extractionScope: 'official_reference_tables_structured',
    generatedAt: '2026-06-18',
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review',
    ...overrides
  };
}
