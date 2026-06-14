import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull, like } from 'drizzle-orm';
import { createDatabaseClient } from '../src/db/client.js';
import { gb2760OfficialRecords, ingredients, type Gb2760OfficialRecordRow } from '../src/db/schema.js';
import { getGb2760AdditiveIdentityKey } from '../src/services/gb2760PromoteService.js';
import { upsertIngredients, type FoodAdditiveInput } from '../src/services/ingredientService.js';

const dataVersion = 'food-gb2760-auto-mapped-v1';
const generatedIngredientKind = 'food-additive';
const reviewedBy = 'codex-gb2760-auto-map';
const reviewedAt = new Date();
const reviewedDate = reviewedAt.toISOString().slice(0, 10);

const client = createDatabaseClient();

try {
  await main();
} finally {
  await client.pool.end();
}

async function main() {
  const normalizedIngredientKinds = await normalizeGeneratedIngredientKinds();
  const rows = await client.db
    .select()
    .from(gb2760OfficialRecords)
    .where(and(
      inArray(gb2760OfficialRecords.reviewStatus, ['pending_review', 'mapped_candidate']),
      isNull(gb2760OfficialRecords.ingredientId)
    ));

  const groups = groupRowsByIdentity(rows);
  if (groups.size === 0) {
    console.log(`GB 2760 auto-map completed createdIngredients=0 mappedRows=0 groups=0 normalizedIngredientKinds=${normalizedIngredientKinds}`);
    return;
  }

  const existingIngredients = await client.db.select().from(ingredients);
  const exactIngredientByIdentity = buildExactIngredientIdentityMap(existingIngredients);
  const additives: FoodAdditiveInput[] = [];
  const mappingByRowId = new Map<string, string>();

  for (const [identityKey, groupRows] of groups) {
    const firstRow = groupRows[0];
    const existingIngredientId = exactIngredientByIdentity.get(identityKey);
    const ingredientId = existingIngredientId || createGeneratedIngredientId(identityKey);
    if (!existingIngredientId) {
      additives.push(toAutoMappedIngredient(ingredientId, groupRows));
    }
    for (const row of groupRows) {
      mappingByRowId.set(row.id, ingredientId);
    }
  }

  if (additives.length > 0) {
    await upsertIngredients(client.db, additives, {
      dataVersion,
      reviewedBy,
      reviewedAt,
      changeNote: 'Auto-created GB 2760 ingredient identity for staging row mapping',
      updateAuditFields: false
    });
  }

  await client.db.transaction(async (tx) => {
    for (const [rowId, ingredientId] of mappingByRowId) {
      await tx
        .update(gb2760OfficialRecords)
        .set({
          ingredientId,
          reviewStatus: 'mapped_candidate',
          reviewedBy,
          reviewedByUserId: reviewedBy,
          reviewedAt,
          reviewNote: 'Auto-mapped GB 2760 staging row to generated or exact ingredient identity; still requires internal reviewer approval before promote.',
          syncedAt: new Date()
        })
        .where(eq(gb2760OfficialRecords.id, rowId));
    }
  });

  console.log([
    'GB 2760 auto-map completed',
    `createdIngredients=${additives.length}`,
    `mappedRows=${mappingByRowId.size}`,
    `groups=${groups.size}`,
    `normalizedIngredientKinds=${normalizedIngredientKinds}`
  ].join(' '));
}

async function normalizeGeneratedIngredientKinds() {
  const normalizedRows = await client.db
    .update(ingredients)
    .set({
      kind: generatedIngredientKind,
      syncedAt: new Date()
    })
    .where(and(
      like(ingredients.id, 'gb2760-additive-%'),
      eq(ingredients.kind, 'food_additive')
    ))
    .returning({ id: ingredients.id });

  return normalizedRows.length;
}

function groupRowsByIdentity(rows: Gb2760OfficialRecordRow[]) {
  const groups = new Map<string, Gb2760OfficialRecordRow[]>();
  for (const row of rows) {
    const key = getGb2760AdditiveIdentityKey(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function buildExactIngredientIdentityMap(existingIngredients: Array<{
  id: string;
  nameCn: string;
  nameEn: string | null;
  gbCode: string;
  eNumber: string | null;
}>) {
  const candidates = new Map<string, string[]>();
  for (const ingredient of existingIngredients) {
    const key = [
      ingredient.nameCn,
      ingredient.nameEn,
      ingredient.gbCode,
      ingredient.eNumber
    ].map(normalizeIdentityField).join('\n');
    const ids = candidates.get(key) || [];
    ids.push(ingredient.id);
    candidates.set(key, ids);
  }

  return new Map([...candidates.entries()]
    .filter(([, ids]) => ids.length === 1)
    .map(([key, ids]) => [key, ids[0]]));
}

function toAutoMappedIngredient(ingredientId: string, rows: Gb2760OfficialRecordRow[]): FoodAdditiveInput {
  const firstRow = rows[0];
  const functions = uniqueStrings(rows.flatMap((row) => splitFunctionText(row.functionText)));
  const category = functions[0] || '食品添加剂';
  const sourceReference = {
    title: firstRow.standardTitle,
    standard: firstRow.standardCode,
    region: 'CN',
    url: firstRow.sourceUrl,
    retrievedAt: firstRow.retrievedAt,
    publishedAt: '2024-02-08'
  };

  return {
    id: ingredientId,
    kind: generatedIngredientKind,
    dataCategory: 'food',
    nameCn: firstRow.additiveNameCn,
    nameEn: firstRow.additiveNameEn || undefined,
    aliases: buildAliases(firstRow),
    category,
    functions,
    description: `${firstRow.additiveNameCn} 是 GB 2760-2024 表 A.1 staging 行收录的食品添加剂身份记录。`,
    riskLevel: 'unknown',
    riskSummary: '该成分身份来自 GB 2760-2024 官方 staging 行；逐食品类别使用规则仍需人工签核后 promote。',
    suitableFor: [],
    cautionFor: [],
    sourceNote: 'GB 2760-2024 official staging identity auto-created for manual review mapping; usage limits are not promoted until staging rows are approved.',
    sourceReferences: [sourceReference],
    reviewStatus: 'mapped_candidate',
    dataStatus: 'mapped_candidate',
    dataVersion,
    reviewedBy,
    reviewedAt: reviewedDate,
    changeNote: 'Auto-created GB 2760 ingredient identity for staging row mapping',
    updatedAt: reviewedDate,
    sourceName: firstRow.sourceName,
    sourceType: firstRow.sourceType,
    sourceScope: 'GB 2760-2024 表 A.1 staging identity',
    sourceVersion: 'GB 2760-2024（发布日期 2024-02-08，实施日期 2025-02-08）',
    sourceUrl: firstRow.sourceUrl,
    effectiveDate: '2025-02-08',
    confidenceLevel: 'medium',
    matchConfidence: 'high',
    lastReviewedAt: reviewedDate,
    reviewNote: `自动从 ${rows.length} 条 GB 2760 staging 行创建成分身份；需要人工签核 staging 行后才能进入正式使用规则。`,
    regulatoryBasis: 'GB 2760-2024 表 A.1 official staging identity; formal usage limits require row-level approval and promote.',
    rawSourceText: firstRow.rawSourceText,
    isVerified: false,
    gbCode: firstRow.cnsNumber || '',
    gbStatus: 'pending_gb2760_row_approval',
    eNumber: normalizeCodeList(firstRow.insNumber) || undefined,
    adi: undefined,
    usageLimits: [],
    foodCategories: [],
    allergenTypes: [],
    cautionGroups: []
  };
}

function createGeneratedIngredientId(identityKey: string) {
  return `gb2760-additive-${createHash('sha256').update(identityKey, 'utf8').digest('hex').slice(0, 16)}`;
}

function normalizeIdentityField(value: string | null | undefined) {
  return String(value || '').trim().replace(/\s+/gu, ' ').toLowerCase();
}

function splitFunctionText(value: string) {
  return String(value || '')
    .split(/[、，,]/gu)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAliases(row: Gb2760OfficialRecordRow) {
  return uniqueStrings([
    row.additiveNameEn || '',
    row.cnsNumber ? `CNS ${row.cnsNumber}` : '',
    row.insNumber && row.insNumber !== '—' ? `INS ${row.insNumber}` : ''
  ].filter(Boolean));
}

function normalizeCodeList(value: string | null) {
  const normalized = String(value || '').trim();
  return normalized && normalized !== '—' ? normalized : '';
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
