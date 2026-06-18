import { createHash } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import {
  additiveUsageRules,
  ingredientAliases,
  ingredientMaster,
  ingredientRegulatoryRules,
  ingredientRelations,
  ingredientSourceRelations,
  ingredientTypeTags,
  officialSources,
  type NewIngredientAliasRow,
  type NewIngredientMasterRow,
  type NewIngredientRegulatoryRuleRow,
  type NewIngredientRelationRow,
  type NewIngredientSourceRelationRow,
  type NewIngredientTypeTagRow,
  type NewOfficialSourceRow
} from '../db/schema.js';
import type { FoodAdditiveInput, Gb2760OfficialRecordInput, Gb2760OfficialReferenceRowInput } from './ingredientService.js';

export const ingredientKnowledgeParserVersion = 'ingredient-knowledge-gb2760-v1';
export const productionNeedUseLevel = '按生产需要适量使用';

export type IngredientType =
  | 'ordinary_ingredient'
  | 'food_additive'
  | 'nutrition_fortifier'
  | 'novel_food_ingredient'
  | 'food_medicine_substance'
  | 'food_microorganism'
  | 'allergen_source'
  | 'compound_ingredient'
  | 'other';

export type SourceStatus = 'official' | 'pending_review' | 'internal_lexicon' | 'safety_evaluation_only' | 'unverified';
export type RelationStatus = 'current' | 'pending_review' | 'superseded' | 'revoked';

export type Gb2760KnowledgeSourceMetadata = {
  sourceName: string;
  sourceType: string;
  sourceUrl: string;
  standardCode: string;
  standardTitle: string;
  publishedAt: string;
  effectiveDate: string;
  retrievedAt: string;
  platformRecordId: string;
  announcementRecordId: string;
  fileGuid: string;
  factName: string;
  pdfSha256: string;
};

export type IngredientKnowledgeDatasetInput = {
  foodIngredients: FoodAdditiveInput[];
  gb2760Records: Gb2760OfficialRecordInput[];
  gb2760ReferenceRows: Gb2760OfficialReferenceRowInput[];
  gb2760Source: Gb2760KnowledgeSourceMetadata;
  formalRuleSourceIds?: ReadonlySet<string>;
};

export type IngredientKnowledgeDataset = {
  officialSources: NewOfficialSourceRow[];
  ingredients: NewIngredientMasterRow[];
  aliases: NewIngredientAliasRow[];
  typeTags: NewIngredientTypeTagRow[];
  sourceRelations: NewIngredientSourceRelationRow[];
  regulatoryRules: NewIngredientRegulatoryRuleRow[];
  relations: NewIngredientRelationRow[];
  legacyStats: IngredientKnowledgeLegacyStats;
  conflictReport: IngredientKnowledgeConflict[];
};

export type IngredientKnowledgeLegacyStats = {
  existingFoodIngredientCount: number;
  existingOfficialCompatibleCount: number;
  unverifiedLegacyCount: number;
  internalLexiconCount: number;
  safetyEvaluationOnlyCount: number;
};

export type IngredientKnowledgeConflict = {
  type: string;
  key: string;
  ids: string[];
};

type MutableMaster = NewIngredientMasterRow;

type DatasetBuilder = {
  officialSourceId: string;
  formalRuleSourceIds: ReadonlySet<string>;
  mastersById: Map<string, MutableMaster>;
  mastersByKey: Map<string, MutableMaster>;
  aliasesByKey: Map<string, NewIngredientAliasRow>;
  typeTagsByKey: Map<string, NewIngredientTypeTagRow>;
  sourceRelationsByKey: Map<string, NewIngredientSourceRelationRow>;
  regulatoryRulesById: Map<string, NewIngredientRegulatoryRuleRow>;
  relationsByKey: Map<string, NewIngredientRelationRow>;
  legacyIdToMasterId: Map<string, string>;
};

export function buildIngredientKnowledgeDataset(input: IngredientKnowledgeDatasetInput): IngredientKnowledgeDataset {
  const officialSource = toGb2760OfficialSource(input.gb2760Source);
  const builder: DatasetBuilder = {
    officialSourceId: officialSource.id,
    formalRuleSourceIds: input.formalRuleSourceIds ?? new Set<string>(),
    mastersById: new Map(),
    mastersByKey: new Map(),
    aliasesByKey: new Map(),
    typeTagsByKey: new Map(),
    sourceRelationsByKey: new Map(),
    regulatoryRulesById: new Map(),
    relationsByKey: new Map(),
    legacyIdToMasterId: new Map()
  };

  const legacyStats = buildLegacyIngredientMasters(builder, input.foodIngredients);
  for (const record of input.gb2760Records) {
    ingestGb2760A1Record(builder, record, input.gb2760Source);
  }
  for (const row of input.gb2760ReferenceRows) {
    ingestGb2760ReferenceRow(builder, row, input.gb2760Source);
  }

  return {
    officialSources: [officialSource],
    ingredients: [...builder.mastersById.values()].sort(sortById),
    aliases: [...builder.aliasesByKey.values()].sort(sortById),
    typeTags: [...builder.typeTagsByKey.values()].sort(sortTypeTag),
    sourceRelations: [...builder.sourceRelationsByKey.values()].sort(sortSourceRelation),
    regulatoryRules: [...builder.regulatoryRulesById.values()].sort(sortById),
    relations: [...builder.relationsByKey.values()].sort(sortIngredientRelation),
    legacyStats,
    conflictReport: detectDatasetConflicts(builder)
  };
}

export async function importIngredientKnowledgeDataset(db: Database, dataset: IngredientKnowledgeDataset) {
  await db.transaction(async (tx) => {
    for (const source of dataset.officialSources) {
      await tx
        .insert(officialSources)
        .values(source)
        .onConflictDoUpdate({
          target: officialSources.id,
          set: {
            ...source,
            createdAt: sql`${officialSources.createdAt}`,
            updatedAt: new Date()
          }
        });
    }

    for (const ingredient of dataset.ingredients) {
      await tx
        .insert(ingredientMaster)
        .values(ingredient)
        .onConflictDoUpdate({
          target: ingredientMaster.id,
          set: {
            ...ingredient,
            createdAt: sql`${ingredientMaster.createdAt}`,
            updatedAt: new Date()
          }
        });
    }

    if (dataset.typeTags.length > 0) {
      const ingredientIds = [...new Set(dataset.typeTags.map((row) => row.ingredientId))];
      await tx.delete(ingredientTypeTags).where(inArray(ingredientTypeTags.ingredientId, ingredientIds));
      await tx.insert(ingredientTypeTags).values(dataset.typeTags);
    }

    for (const alias of dataset.aliases) {
      await tx
        .insert(ingredientAliases)
        .values(alias)
        .onConflictDoUpdate({
          target: [ingredientAliases.ingredientId, ingredientAliases.normalizedAlias, ingredientAliases.aliasType],
          set: {
            aliasName: alias.aliasName,
            language: alias.language,
            sourceId: alias.sourceId,
            sourceStatus: alias.sourceStatus,
            isOfficial: alias.isOfficial
          }
        });
    }

    for (const relation of dataset.sourceRelations) {
      await tx
        .insert(ingredientSourceRelations)
        .values(relation)
        .onConflictDoUpdate({
          target: [
            ingredientSourceRelations.ingredientId,
            ingredientSourceRelations.sourceId,
            ingredientSourceRelations.sourceLocation,
            ingredientSourceRelations.originalName
          ],
          set: {
            pageNumber: relation.pageNumber,
            tableName: relation.tableName,
            rowReference: relation.rowReference,
            evidenceSummary: relation.evidenceSummary,
            validFrom: relation.validFrom,
            validTo: relation.validTo,
            status: relation.status
          }
        });
    }

    for (const rule of dataset.regulatoryRules) {
      await tx
        .insert(ingredientRegulatoryRules)
        .values(rule)
        .onConflictDoUpdate({
          target: ingredientRegulatoryRules.id,
          set: rule
        });
    }

    if (dataset.relations.length > 0) {
      for (const relation of dataset.relations) {
        await tx
          .insert(ingredientRelations)
          .values(relation)
          .onConflictDoUpdate({
            target: [
              ingredientRelations.sourceIngredientId,
              ingredientRelations.targetIngredientId,
              ingredientRelations.relationType
            ],
            set: {
              officialSourceId: relation.officialSourceId,
              notes: relation.notes
            }
          });
      }
    }
  });
}

export async function getFormalGb2760RuleSourceIds(db: Database) {
  const rows = await db
    .select({ sourceStagingId: additiveUsageRules.sourceStagingId })
    .from(additiveUsageRules);
  return new Set(rows.map((row) => row.sourceStagingId));
}

export async function getIngredientKnowledgeDbStats(db: Database) {
  const [
    totalIngredients,
    aliasRows,
    ruleRows,
    sourceRows,
    relationRows,
    sourceRelationRows,
    conflictRows
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(ingredientMaster),
    db.select({ count: sql<number>`count(*)::int` }).from(ingredientAliases),
    db.select({ count: sql<number>`count(*)::int` }).from(ingredientRegulatoryRules),
    db.select({ count: sql<number>`count(*)::int` }).from(officialSources),
    db.select({ count: sql<number>`count(*)::int` }).from(ingredientRelations),
    db.select({ count: sql<number>`count(*)::int` }).from(ingredientSourceRelations),
    db
      .select({
        normalizedAlias: ingredientAliases.normalizedAlias,
        count: sql<number>`count(distinct ${ingredientAliases.ingredientId})::int`
      })
      .from(ingredientAliases)
      .where(sql`coalesce(${ingredientAliases.matchPolicy}, 'normal') <> 'candidate_only'`)
      .groupBy(ingredientAliases.normalizedAlias)
      .having(sql`count(distinct ${ingredientAliases.ingredientId}) > 1`)
  ]);
  const byType = await db
    .select({
      ingredientType: ingredientMaster.ingredientType,
      count: sql<number>`count(*)::int`
    })
    .from(ingredientMaster)
    .groupBy(ingredientMaster.ingredientType);
  const bySource = await db
    .select({
      sourceId: ingredientSourceRelations.sourceId,
      count: sql<number>`count(distinct ${ingredientSourceRelations.ingredientId})::int`
    })
    .from(ingredientSourceRelations)
    .groupBy(ingredientSourceRelations.sourceId);
  const ruleStatus = await db
    .select({
      status: ingredientRegulatoryRules.status,
      count: sql<number>`count(*)::int`
    })
    .from(ingredientRegulatoryRules)
    .groupBy(ingredientRegulatoryRules.status);
  const verifiedRelations = await db
    .select({ count: sql<number>`count(distinct ${ingredientSourceRelations.ingredientId})::int` })
    .from(ingredientSourceRelations)
    .where(eq(ingredientSourceRelations.status, 'current'));
  const unverifiedLegacy = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ingredientMaster)
    .where(eq(ingredientMaster.sourceStatus, 'unverified'));

  return {
    totalIngredients: totalIngredients[0]?.count ?? 0,
    aliasCount: aliasRows[0]?.count ?? 0,
    ruleCount: ruleRows[0]?.count ?? 0,
    officialSourceCount: sourceRows[0]?.count ?? 0,
    sourceRelationCount: sourceRelationRows[0]?.count ?? 0,
    relationCount: relationRows[0]?.count ?? 0,
    officialEvidenceIngredientCount: verifiedRelations[0]?.count ?? 0,
    unverifiedLegacyCount: unverifiedLegacy[0]?.count ?? 0,
    conflictCount: conflictRows.length,
    byType: Object.fromEntries(byType.map((row) => [row.ingredientType, row.count])),
    bySource: Object.fromEntries(bySource.map((row) => [row.sourceId, row.count])),
    ruleStatus: Object.fromEntries(ruleStatus.map((row) => [row.status, row.count]))
  };
}

export function validateIngredientKnowledgeDataset(dataset: IngredientKnowledgeDataset) {
  const errors: string[] = [];
  const sourceIds = new Set(dataset.officialSources.map((source) => source.id));
  const ingredientIds = new Set(dataset.ingredients.map((ingredient) => ingredient.id));
  const normalizedNameKeys = new Set<string>();

  for (const source of dataset.officialSources) {
    requireValue(source.sourceOrg, `${source.id}.sourceOrg`, errors);
    requireValue(source.sourceType, `${source.id}.sourceType`, errors);
    requireValue(source.title, `${source.id}.title`, errors);
    requireValue(source.sourceUrl, `${source.id}.sourceUrl`, errors);
    requireValue(source.retrievedAt, `${source.id}.retrievedAt`, errors);
    requireValue(source.contentHash, `${source.id}.contentHash`, errors);
  }

  for (const ingredient of dataset.ingredients) {
    requireValue(ingredient.canonicalName, `${ingredient.id}.canonicalName`, errors);
    requireValue(ingredient.normalizedName, `${ingredient.id}.normalizedName`, errors);
    const key = `${ingredient.normalizedName}|${ingredient.ingredientType}`;
    if (normalizedNameKeys.has(key)) {
      errors.push(`Duplicate normalized ingredient key: ${key}`);
    }
    normalizedNameKeys.add(key);
  }

  for (const alias of dataset.aliases) {
    requireValue(alias.aliasName, `${alias.id}.aliasName`, errors);
    requireValue(alias.normalizedAlias, `${alias.id}.normalizedAlias`, errors);
    if (!ingredientIds.has(alias.ingredientId)) {
      errors.push(`${alias.id}.ingredientId does not exist: ${alias.ingredientId}`);
    }
    if (alias.sourceStatus === 'official' && (!alias.sourceId || !sourceIds.has(alias.sourceId))) {
      errors.push(`${alias.id} official alias must reference official source`);
    }
    if (alias.sourceStatus !== 'official' && alias.sourceId) {
      errors.push(`${alias.id} non-official alias must not reference official source`);
    }
  }

  for (const relation of dataset.sourceRelations) {
    if (!ingredientIds.has(relation.ingredientId)) {
      errors.push(`source relation ingredient does not exist: ${relation.ingredientId}`);
    }
    if (!sourceIds.has(relation.sourceId)) {
      errors.push(`source relation source does not exist: ${relation.sourceId}`);
    }
    requireValue(relation.originalName, `${relation.ingredientId}.sourceRelation.originalName`, errors);
    requireValue(relation.evidenceSummary, `${relation.ingredientId}.sourceRelation.evidenceSummary`, errors);
  }

  for (const rule of dataset.regulatoryRules) {
    if (!ingredientIds.has(rule.ingredientId)) {
      errors.push(`${rule.id}.ingredientId does not exist: ${rule.ingredientId}`);
    }
    if (!sourceIds.has(rule.sourceId)) {
      errors.push(`${rule.id}.sourceId does not exist: ${rule.sourceId}`);
    }
    requireValue(rule.foodCategoryCode, `${rule.id}.foodCategoryCode`, errors);
    requireValue(rule.foodCategoryName, `${rule.id}.foodCategoryName`, errors);
    if (!rule.maxUseLevel && !rule.residueLevel && !rule.usePrinciple) {
      errors.push(`${rule.id} must keep maxUseLevel, residueLevel or usePrinciple`);
    }
    if (rule.maxUseLevel && rule.maxUseLevel !== productionNeedUseLevel && !rule.unit) {
      errors.push(`${rule.id}.unit is required when maxUseLevel is numeric/textual limit`);
    }
    if (rule.status === 'revoked' && rule.validTo === null) {
      errors.push(`${rule.id}.validTo is required for revoked rule`);
    }
  }

  for (const relation of dataset.relations) {
    if (!ingredientIds.has(relation.sourceIngredientId)) {
      errors.push(`relation sourceIngredientId does not exist: ${relation.sourceIngredientId}`);
    }
    if (!ingredientIds.has(relation.targetIngredientId)) {
      errors.push(`relation targetIngredientId does not exist: ${relation.targetIngredientId}`);
    }
  }

  return errors;
}

export function summarizeIngredientKnowledgeDataset(dataset: IngredientKnowledgeDataset) {
  const byType = countBy(dataset.ingredients, (row) => row.ingredientType);
  const rulesByStatus = countBy(dataset.regulatoryRules, (row) => row.status);
  const sourceRelationsByStatus = countBy(dataset.sourceRelations, (row) => row.status);
  const officialEvidenceIngredientCount = new Set(dataset.sourceRelations.map((row) => row.ingredientId)).size;

  return {
    existingFoodIngredientCount: dataset.legacyStats.existingFoodIngredientCount,
    totalIngredientCount: dataset.ingredients.length,
    newIngredientMasterCount: Math.max(0, dataset.ingredients.length - dataset.legacyStats.existingFoodIngredientCount),
    byType,
    officialSourceCount: dataset.officialSources.length,
    officialEvidenceIngredientCount,
    unverifiedLegacyCount: dataset.legacyStats.unverifiedLegacyCount,
    internalLexiconCount: dataset.legacyStats.internalLexiconCount,
    safetyEvaluationOnlyCount: dataset.legacyStats.safetyEvaluationOnlyCount,
    aliasCount: dataset.aliases.length,
    ruleCount: dataset.regulatoryRules.length,
    relationCount: dataset.relations.length,
    conflictCount: dataset.conflictReport.length,
    sourceRelationCount: dataset.sourceRelations.length,
    rulesByStatus,
    sourceRelationsByStatus
  };
}

function buildLegacyIngredientMasters(builder: DatasetBuilder, foodIngredients: FoodAdditiveInput[]): IngredientKnowledgeLegacyStats {
  let existingOfficialCompatibleCount = 0;
  let unverifiedLegacyCount = 0;
  let internalLexiconCount = 0;
  let safetyEvaluationOnlyCount = 0;

  for (const item of foodIngredients) {
    const sourceStatus = getLegacySourceStatus(item);
    if (sourceStatus === 'official') existingOfficialCompatibleCount += 1;
    if (sourceStatus === 'unverified') unverifiedLegacyCount += 1;
    if (sourceStatus === 'internal_lexicon') internalLexiconCount += 1;
    if (sourceStatus === 'safety_evaluation_only') safetyEvaluationOnlyCount += 1;

    const master = upsertMaster(builder, {
      id: `ik-${item.id}`,
      canonicalName: item.nameCn,
      normalizedName: normalizeIngredientName(item.nameCn),
      ingredientType: item.kind === 'common-food-ingredient' ? 'ordinary_ingredient' : 'food_additive',
      regulatoryStatus: item.dataStatus,
      description: item.description,
      cnsCode: null,
      insCode: normalizeInsCode(item.gbCode),
      casNumber: null,
      sourceStatus,
      legacyIngredientId: item.id,
      legacyKind: item.kind,
      enabled: true
    });
    builder.legacyIdToMasterId.set(item.id, master.id);

    addTypeTag(builder, master.id, master.ingredientType, null);
    addAlias(builder, master.id, item.nameCn, 'canonical_name', 'zh', sourceStatus === 'official' ? builder.officialSourceId : null, sourceStatus === 'official' ? 'official' : 'legacy_unverified');
    if (item.nameEn) {
      addAlias(builder, master.id, item.nameEn, 'legacy_name', 'en', null, 'legacy_unverified');
    }
    if (item.gbCode && normalizeInsCode(item.gbCode) && sourceStatus === 'official') {
      addAlias(builder, master.id, `INS ${normalizeInsCode(item.gbCode)}`, 'official_code', 'und', builder.officialSourceId, 'official');
    }
    for (const alias of item.aliases ?? []) {
      const isOfficialInsAlias = sourceStatus === 'official' && /^INS\s*\S+/iu.test(alias);
      addAlias(
        builder,
        master.id,
        alias,
        isOfficialInsAlias ? 'official_code' : 'legacy_alias',
        getAliasLanguage(alias),
        isOfficialInsAlias ? builder.officialSourceId : null,
        isOfficialInsAlias ? 'official' : 'legacy_unverified'
      );
    }

    if (sourceStatus === 'official') {
      addSourceRelation(builder, {
        ingredientId: master.id,
        sourceId: builder.officialSourceId,
        sourceLocation: 'legacy_seed_verified_regulation',
        pageNumber: null,
        tableName: '表 A.1',
        rowReference: item.id,
        originalName: item.nameCn,
        evidenceSummary: item.regulatoryBasis,
        validFrom: item.effectiveDate || null,
        validTo: null,
        status: 'current'
      });
    }
  }

  return {
    existingFoodIngredientCount: foodIngredients.length,
    existingOfficialCompatibleCount,
    unverifiedLegacyCount,
    internalLexiconCount,
    safetyEvaluationOnlyCount
  };
}

function ingestGb2760A1Record(builder: DatasetBuilder, record: Gb2760OfficialRecordInput, source: Gb2760KnowledgeSourceMetadata) {
  const parsedName = parseOfficialName(record.additiveNameCn);
  const master = upsertMaster(builder, {
    id: getMasterIdForOfficialRecord(builder, record, parsedName.canonicalName, 'food_additive'),
    canonicalName: parsedName.canonicalName,
    normalizedName: normalizeIngredientName(parsedName.canonicalName),
    ingredientType: 'food_additive',
    regulatoryStatus: isCurrentOfficialRecord(builder, record) ? 'verified_regulation' : 'pending_review',
    description: `GB 2760-2024 ${record.tableName} 食品添加剂记录。`,
    cnsCode: normalizeNullable(record.cnsNumber),
    insCode: normalizeNullable(record.insNumber),
    casNumber: null,
    sourceStatus: isCurrentOfficialRecord(builder, record) ? 'official' : 'pending_review',
    legacyIngredientId: normalizeNullable(record.ingredientId),
    legacyKind: record.ingredientId ? 'food-additive' : null,
    enabled: true
  });
  if (record.ingredientId) builder.legacyIdToMasterId.set(record.ingredientId, master.id);
  addTypeTag(builder, master.id, 'food_additive', builder.officialSourceId);
  addOfficialNameAliases(builder, master.id, parsedName, record.additiveNameCn);
  if (record.additiveNameEn) addAlias(builder, master.id, record.additiveNameEn, 'official_name_variant', 'en', builder.officialSourceId, 'official');
  const cnsCode = normalizeNullable(record.cnsNumber);
  const insCode = normalizeNullable(record.insNumber);
  if (cnsCode) addAlias(builder, master.id, `CNS ${cnsCode}`, 'official_code', 'und', builder.officialSourceId, 'official');
  if (insCode) addAlias(builder, master.id, `INS ${insCode}`, 'official_code', 'und', builder.officialSourceId, 'official');

  addSourceRelation(builder, {
    ingredientId: master.id,
    sourceId: builder.officialSourceId,
    sourceLocation: record.id,
    pageNumber: record.pdfPage,
    tableName: record.tableName,
    rowReference: `${record.tableName} row ${record.id}`,
    originalName: record.additiveNameCn,
    evidenceSummary: toEvidenceSummary(record.rawSourceText),
    validFrom: source.effectiveDate,
    validTo: null,
    status: isCurrentOfficialRecord(builder, record) ? 'current' : 'pending_review'
  });

  addRegulatoryRule(builder, {
    id: `ik-rule-${record.id}`,
    ingredientId: master.id,
    sourceId: builder.officialSourceId,
    foodCategoryCode: record.foodCategoryCode || '—',
    foodCategoryName: record.foodCategoryName || '各类食品或标准规定范围',
    allowedStatus: 'allowed',
    maxUseLevel: record.maxUseLevel || null,
    unit: record.unit || null,
    residueLevel: null,
    usePrinciple: record.maxUseLevel === productionNeedUseLevel ? productionNeedUseLevel : null,
    restrictions: record.note || null,
    notes: formatRuleNotes(record),
    validFrom: source.effectiveDate,
    validTo: null,
    status: isCurrentOfficialRecord(builder, record) ? 'current' : 'pending_review',
    legacyAdditiveUsageRuleId: null,
    sourceStagingId: record.id
  });
}

function ingestGb2760ReferenceRow(builder: DatasetBuilder, row: Gb2760OfficialReferenceRowInput, source: Gb2760KnowledgeSourceMetadata) {
  if (row.tableName === '表 B.2' || row.tableName === '表 B.3' || row.tableName === '附录 F') {
    ingestGb2760ReferenceIngredient(builder, row, source, 'food_additive');
    return;
  }

  if (row.tableName === '表 C.1' || row.tableName === '表 C.2') {
    const master = ingestGb2760ReferenceIngredient(builder, row, source, 'food_additive');
    addRegulatoryRule(builder, {
      id: `ik-rule-${row.id}`,
      ingredientId: master.id,
      sourceId: builder.officialSourceId,
      foodCategoryCode: row.tableName === '表 C.1' ? 'processing_aid_all_foods' : 'processing_aid_scope_required',
      foodCategoryName: row.tableName === '表 C.1'
        ? '各类食品加工过程中'
        : String(row.rowData?.useScope || '标准规定使用范围'),
      allowedStatus: 'allowed',
      maxUseLevel: null,
      unit: null,
      residueLevel: row.tableName === '表 C.1' ? '残留量不需限定' : null,
      usePrinciple: row.tableName === '表 C.1' ? '可在各类食品加工过程中使用,残留量不需限定' : String(row.rowData?.functionText || ''),
      restrictions: String(row.rowData?.useScope || ''),
      notes: `${row.tableName} ${row.tableTitle}; PDF page ${row.pdfPage} / 标准页 ${row.standardPage}`,
      validFrom: source.effectiveDate,
      validTo: null,
      status: 'pending_review',
      legacyAdditiveUsageRuleId: null,
      sourceStagingId: null
    });
    return;
  }

  if (row.tableName === '表 C.3') {
    const enzyme = ingestGb2760ReferenceIngredient(builder, row, source, 'food_additive');
    addRegulatoryRule(builder, {
      id: `ik-rule-${row.id}`,
      ingredientId: enzyme.id,
      sourceId: builder.officialSourceId,
      foodCategoryCode: 'enzyme_preparation',
      foodCategoryName: '食品用酶制剂',
      allowedStatus: 'allowed',
      maxUseLevel: null,
      unit: null,
      residueLevel: null,
      usePrinciple: '食品用酶制剂及其来源名单',
      restrictions: String(row.rowData?.source || ''),
      notes: `${row.tableName} ${row.tableTitle}; PDF page ${row.pdfPage} / 标准页 ${row.standardPage}`,
      validFrom: source.effectiveDate,
      validTo: null,
      status: 'pending_review',
      legacyAdditiveUsageRuleId: null,
      sourceStagingId: null
    });
    addMicroorganismRelation(builder, enzyme.id, String(row.rowData?.source || ''), 'enzyme_source', row);
    addMicroorganismRelation(builder, enzyme.id, String(row.rowData?.donor || ''), 'enzyme_donor', row);
  }
}

function ingestGb2760ReferenceIngredient(
  builder: DatasetBuilder,
  row: Gb2760OfficialReferenceRowInput,
  source: Gb2760KnowledgeSourceMetadata,
  ingredientType: IngredientType
) {
  const parsedName = parseOfficialName(getReferenceCanonicalName(row));
  const master = upsertMaster(builder, {
    id: `ik-${row.id}`,
    canonicalName: parsedName.canonicalName,
    normalizedName: normalizeIngredientName(parsedName.canonicalName),
    ingredientType,
    regulatoryStatus: 'pending_review',
    description: `GB 2760-2024 ${row.tableName} ${row.tableTitle} 参考表记录。`,
    cnsCode: null,
    insCode: normalizeNullable(readReferenceInsNumber(row)),
    casNumber: null,
    sourceStatus: 'pending_review',
    legacyIngredientId: null,
    legacyKind: null,
    enabled: true
  });
  addTypeTag(builder, master.id, ingredientType, builder.officialSourceId);
  addOfficialNameAliases(builder, master.id, parsedName, getReferenceCanonicalName(row));
  for (const alias of getReferenceAliases(row)) {
    addAlias(builder, master.id, alias.name, alias.type, alias.language, builder.officialSourceId, 'official');
  }
  addSourceRelation(builder, {
    ingredientId: master.id,
    sourceId: builder.officialSourceId,
    sourceLocation: row.id,
    pageNumber: row.pdfPage,
    tableName: row.tableName,
    rowReference: `${row.tableName} row ${row.rowNumber}`,
    originalName: getReferenceCanonicalName(row),
    evidenceSummary: toEvidenceSummary(row.rawSourceText),
    validFrom: source.effectiveDate,
    validTo: null,
    status: 'pending_review'
  });
  return master;
}

function addMicroorganismRelation(
  builder: DatasetBuilder,
  enzymeIngredientId: string,
  rawName: string,
  relationType: 'enzyme_source' | 'enzyme_donor',
  row: Gb2760OfficialReferenceRowInput
) {
  const parsed = parseBilingualName(rawName);
  if (!parsed.canonicalName) return;
  const microorganism = upsertMaster(builder, {
    id: `ik-${relationType}-${hashText(parsed.canonicalName).slice(0, 16)}`,
    canonicalName: parsed.canonicalName,
    normalizedName: normalizeIngredientName(parsed.canonicalName),
    ingredientType: 'food_microorganism',
    regulatoryStatus: 'pending_review',
    description: `GB 2760-2024 表 C.3 食品用酶制剂${relationType === 'enzyme_source' ? '来源' : '供体'}。`,
    cnsCode: null,
    insCode: null,
    casNumber: null,
    sourceStatus: 'pending_review',
    legacyIngredientId: null,
    legacyKind: null,
    enabled: true
  });
  addTypeTag(builder, microorganism.id, 'food_microorganism', builder.officialSourceId);
  addAlias(builder, microorganism.id, parsed.canonicalName, 'canonical_name', 'zh', builder.officialSourceId, 'official');
  if (parsed.latinName) {
    addAlias(builder, microorganism.id, parsed.latinName, 'official_name_variant', 'la', builder.officialSourceId, 'official');
  }
  addSourceRelation(builder, {
    ingredientId: microorganism.id,
    sourceId: builder.officialSourceId,
    sourceLocation: `${row.id}:${relationType}`,
    pageNumber: row.pdfPage,
    tableName: row.tableName,
    rowReference: `${row.tableName} row ${row.rowNumber}`,
    originalName: rawName,
    evidenceSummary: toEvidenceSummary(row.rawSourceText),
    validFrom: null,
    validTo: null,
    status: 'pending_review'
  });
  addRelation(builder, enzymeIngredientId, microorganism.id, relationType, builder.officialSourceId, row.rawSourceText);
}

function upsertMaster(builder: DatasetBuilder, input: NewIngredientMasterRow): MutableMaster {
  const normalizedName = normalizeIngredientName(input.normalizedName || input.canonicalName);
  const key = `${normalizedName}|${input.ingredientType}`;
  const existing = builder.mastersByKey.get(key);
  if (existing) {
    existing.regulatoryStatus = mergeRegulatoryStatus(existing.regulatoryStatus, input.regulatoryStatus);
    existing.sourceStatus = mergeSourceStatus(existing.sourceStatus as SourceStatus, input.sourceStatus as SourceStatus);
    existing.description = existing.description || input.description;
    existing.cnsCode = existing.cnsCode || input.cnsCode || null;
    existing.insCode = existing.insCode || input.insCode || null;
    existing.casNumber = existing.casNumber || input.casNumber || null;
    existing.legacyIngredientId = existing.legacyIngredientId || input.legacyIngredientId || null;
    existing.legacyKind = existing.legacyKind || input.legacyKind || null;
    existing.enabled = existing.enabled && input.enabled !== false;
    return existing;
  }

  const row: MutableMaster = {
    ...input,
    id: input.id,
    canonicalName: input.canonicalName.trim(),
    normalizedName,
    description: input.description || '',
    cnsCode: input.cnsCode ?? null,
    insCode: input.insCode ?? null,
    casNumber: input.casNumber ?? null,
    legacyIngredientId: input.legacyIngredientId ?? null,
    legacyKind: input.legacyKind ?? null,
    enabled: input.enabled !== false
  };
  builder.mastersById.set(row.id, row);
  builder.mastersByKey.set(key, row);
  return row;
}

function addOfficialNameAliases(builder: DatasetBuilder, ingredientId: string, parsedName: ParsedOfficialName, originalName: string) {
  addAlias(builder, ingredientId, parsedName.canonicalName, 'canonical_name', 'zh', builder.officialSourceId, 'official');
  if (originalName !== parsedName.canonicalName) {
    addAlias(builder, ingredientId, originalName, 'official_name_variant', 'zh', builder.officialSourceId, 'official');
  }
  for (const alias of parsedName.officialAliases) {
    addAlias(builder, ingredientId, alias, 'official_name_variant', getAliasLanguage(alias), builder.officialSourceId, 'official');
  }
}

function addAlias(
  builder: DatasetBuilder,
  ingredientId: string,
  aliasName: string,
  aliasType: string,
  language: string,
  sourceId: string | null,
  sourceStatus: 'official' | 'format_variant' | 'legacy_unverified'
) {
  const normalized = normalizeIngredientName(aliasName);
  if (!normalized) return;
  const id = `ik-alias-${hashText(`${ingredientId}|${normalized}|${aliasType}`).slice(0, 20)}`;
  const key = `${ingredientId}|${normalized}|${aliasType}`;
  builder.aliasesByKey.set(key, {
    id,
    ingredientId,
    aliasName: aliasName.trim(),
    normalizedAlias: normalized,
    aliasType,
    language,
    sourceId,
    sourceStatus,
    isOfficial: sourceStatus === 'official'
  });

  const formattingAlias = normalizeFormatVariant(aliasName);
  if (formattingAlias && formattingAlias !== aliasName.trim() && normalizeIngredientName(formattingAlias) !== normalized) {
    const formatNormalized = normalizeIngredientName(formattingAlias);
    const formatKey = `${ingredientId}|${formatNormalized}|format_variant`;
    builder.aliasesByKey.set(formatKey, {
      id: `ik-alias-${hashText(formatKey).slice(0, 20)}`,
      ingredientId,
      aliasName: formattingAlias,
      normalizedAlias: formatNormalized,
      aliasType: 'format_variant',
      language,
      sourceId: null,
      sourceStatus: 'format_variant',
      isOfficial: false
    });
  }
}

function addTypeTag(builder: DatasetBuilder, ingredientId: string, tag: string, sourceId: string | null) {
  builder.typeTagsByKey.set(`${ingredientId}|${tag}`, {
    ingredientId,
    tag,
    sourceId
  });
}

function addSourceRelation(builder: DatasetBuilder, row: NewIngredientSourceRelationRow) {
  builder.sourceRelationsByKey.set(
    `${row.ingredientId}|${row.sourceId}|${row.sourceLocation}|${row.originalName}`,
    row
  );
}

function addRegulatoryRule(builder: DatasetBuilder, row: NewIngredientRegulatoryRuleRow) {
  builder.regulatoryRulesById.set(row.id, row);
}

function addRelation(
  builder: DatasetBuilder,
  sourceIngredientId: string,
  targetIngredientId: string,
  relationType: string,
  officialSourceId: string | null,
  notes: string
) {
  builder.relationsByKey.set(`${sourceIngredientId}|${targetIngredientId}|${relationType}`, {
    sourceIngredientId,
    targetIngredientId,
    relationType,
    officialSourceId,
    notes: toEvidenceSummary(notes)
  });
}

function toGb2760OfficialSource(source: Gb2760KnowledgeSourceMetadata): NewOfficialSourceRow {
  return {
    id: `official-source-gb2760-2024-${source.pdfSha256.slice(0, 12)}`,
    sourceOrg: '国家卫生健康委员会 / 食品安全国家标准数据检索平台',
    sourceType: 'official_standard',
    standardNo: source.standardCode,
    announcementNo: '2024年第1号',
    title: source.standardTitle,
    sourceUrl: source.sourceUrl,
    publicationDate: source.publishedAt,
    effectiveDate: source.effectiveDate,
    retrievedAt: source.retrievedAt,
    contentHash: source.pdfSha256,
    parserVersion: ingredientKnowledgeParserVersion,
    status: 'active'
  };
}

function getLegacySourceStatus(item: FoodAdditiveInput): SourceStatus {
  if (item.dataStatus === 'verified_regulation' && item.sourceScope === 'gb_2760_regulation') return 'official';
  if (item.dataStatus === 'common_ingredient') return 'internal_lexicon';
  if (item.dataStatus === 'verified_jecfa') return 'safety_evaluation_only';
  return 'unverified';
}

function getMasterIdForOfficialRecord(
  builder: DatasetBuilder,
  record: Gb2760OfficialRecordInput,
  canonicalName: string,
  ingredientType: IngredientType
) {
  if (record.ingredientId && builder.legacyIdToMasterId.has(record.ingredientId)) {
    return builder.legacyIdToMasterId.get(record.ingredientId) as string;
  }
  const key = `${normalizeIngredientName(canonicalName)}|${ingredientType}`;
  const existing = builder.mastersByKey.get(key);
  if (existing) return existing.id;
  return `ik-gb2760-a1-${hashText(`${canonicalName}|${record.cnsNumber || ''}|${record.insNumber || ''}`).slice(0, 16)}`;
}

function isCurrentOfficialRecord(builder: DatasetBuilder, record: Gb2760OfficialRecordInput) {
  return record.reviewStatus === 'verified' || record.reviewStatus === 'promoted' || builder.formalRuleSourceIds.has(record.id);
}

function getReferenceCanonicalName(row: Gb2760OfficialReferenceRowInput) {
  if (typeof row.rowData?.flavorNameCn === 'string') return row.rowData.flavorNameCn;
  if (typeof row.rowData?.processingAidNameCn === 'string') return row.rowData.processingAidNameCn;
  if (typeof row.rowData?.enzymeName === 'string') return row.rowData.enzymeName;
  if (typeof row.rowData?.additiveNameCn === 'string') return row.rowData.additiveNameCn;
  return row.rowName;
}

function getReferenceAliases(row: Gb2760OfficialReferenceRowInput) {
  const aliases: Array<{ name: string; type: string; language: string }> = [];
  for (const field of ['flavorNameEn', 'processingAidNameEn'] as const) {
    const value = row.rowData?.[field];
    if (typeof value === 'string' && value.trim()) {
      aliases.push({ name: value, type: 'official_name_variant', language: 'en' });
    }
  }
  if (row.rowCode && !/^\d+$/u.test(row.rowCode)) {
    aliases.push({ name: row.rowCode, type: 'official_code', language: 'und' });
  }
  const ins = readReferenceInsNumber(row);
  if (ins) aliases.push({ name: `INS ${ins}`, type: 'official_code', language: 'und' });
  return aliases;
}

function readReferenceInsNumber(row: Gb2760OfficialReferenceRowInput) {
  const value = row.rowData?.insNumber;
  return typeof value === 'string' ? normalizeNullable(value) || '' : '';
}

type ParsedOfficialName = {
  canonicalName: string;
  officialAliases: string[];
};

export function parseOfficialName(value: string): ParsedOfficialName {
  const text = String(value || '').trim();
  const aliases: string[] = [];
  const canonical = text.replace(/[（(]([^（）()]*)[）)]/gu, (full, content: string) => {
    const extracted = extractOfficialAliasesFromParenthetical(content);
    aliases.push(...extracted);
    return extracted.length > 0 ? '' : full;
  }).trim();
  return {
    canonicalName: canonical || text,
    officialAliases: uniqueTextList(aliases)
  };
}

function extractOfficialAliasesFromParenthetical(content: string) {
  const normalized = content.trim();
  const match = normalized.match(/^(?:又名|别名|包括)\s*(.+)$/u);
  if (!match) return [];
  return match[1]
    .split(/[、，,;；]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBilingualName(value: string) {
  const text = String(value || '').trim();
  if (!text) return { canonicalName: '', latinName: '' };
  const match = text.match(/^(.+?)\s+([A-Z][A-Za-z.\-\s]+\b(?:sp\.|spp\.)?(?:\s+[A-Z0-9][A-Za-z0-9.\-]*)*)$/u);
  if (!match) return { canonicalName: text, latinName: '' };
  return {
    canonicalName: match[1].trim(),
    latinName: match[2].replace(/\s+/g, ' ').trim()
  };
}

export function normalizeIngredientName(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[（]/gu, '(')
    .replace(/[）]/gu, ')')
    .replace(/\s+/gu, '')
    .replace(/[·•・]/gu, '')
    .replace(/[，、,;；:：]/gu, '')
    .replace(/^食品添加剂/u, '')
    .replace(/^添加剂/u, '');
}

function normalizeFormatVariant(value: string) {
  const normalized = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[（]/gu, '(')
    .replace(/[）]/gu, ')')
    .replace(/\s+/gu, ' ');
  return normalized === value ? '' : normalized;
}

function normalizeInsCode(value?: string | null) {
  const match = String(value || '').match(/INS\s*([0-9]+[a-z]?(?:\([^)]+\))?)/iu);
  return match ? match[1].trim() : normalizeNullable(value);
}

function normalizeNullable(value?: string | null) {
  const text = String(value || '').trim();
  return text && !['N/A', '—', '-', '/'].includes(text) ? text : null;
}

function mergeRegulatoryStatus(current: string, next: string) {
  const rank = new Map([
    ['verified_regulation', 5],
    ['pending_review', 4],
    ['verified_jecfa', 3],
    ['common_ingredient', 2],
    ['mapped_candidate', 1],
    ['unverified', 0]
  ]);
  return (rank.get(next) ?? 0) > (rank.get(current) ?? 0) ? next : current;
}

function mergeSourceStatus(current: SourceStatus, next: SourceStatus) {
  const rank = new Map<SourceStatus, number>([
    ['official', 5],
    ['pending_review', 4],
    ['safety_evaluation_only', 3],
    ['internal_lexicon', 2],
    ['unverified', 1]
  ]);
  return (rank.get(next) ?? 0) > (rank.get(current) ?? 0) ? next : current;
}

function formatRuleNotes(record: Gb2760OfficialRecordInput) {
  const parts = [
    record.note,
    `${record.tableName}; PDF page ${record.pdfPage} / 标准页 ${record.standardPage}`
  ].filter(Boolean);
  return parts.join('；');
}

function toEvidenceSummary(value: string) {
  return String(value || '').replace(/\s+/gu, ' ').trim().slice(0, 500);
}

function getAliasLanguage(value: string) {
  return /[\u4e00-\u9fa5]/u.test(value) ? 'zh' : /^[A-Za-z0-9\s().'-]+$/u.test(value) ? 'en' : 'und';
}

function uniqueTextList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function countBy<T>(items: T[], readKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = readKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function detectDatasetConflicts(builder: DatasetBuilder): IngredientKnowledgeConflict[] {
  const aliasToIngredients = new Map<string, Set<string>>();
  for (const alias of builder.aliasesByKey.values()) {
    if (alias.sourceStatus !== 'official') continue;
    const set = aliasToIngredients.get(alias.normalizedAlias) ?? new Set<string>();
    set.add(alias.ingredientId);
    aliasToIngredients.set(alias.normalizedAlias, set);
  }

  return [...aliasToIngredients.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([key, ids]) => ({
      type: 'official_alias_conflict',
      key,
      ids: [...ids].sort()
    }));
}

function requireValue(value: unknown, label: string, errors: string[]) {
  if (String(value ?? '').trim() === '') {
    errors.push(`${label} is required`);
  }
}

function sortById<T extends { id: string }>(a: T, b: T) {
  return a.id.localeCompare(b.id);
}

function sortTypeTag(a: NewIngredientTypeTagRow, b: NewIngredientTypeTagRow) {
  return `${a.ingredientId}|${a.tag}`.localeCompare(`${b.ingredientId}|${b.tag}`);
}

function sortSourceRelation(a: NewIngredientSourceRelationRow, b: NewIngredientSourceRelationRow) {
  return `${a.ingredientId}|${a.sourceLocation}`.localeCompare(`${b.ingredientId}|${b.sourceLocation}`);
}

function sortIngredientRelation(a: NewIngredientRelationRow, b: NewIngredientRelationRow) {
  return `${a.sourceIngredientId}|${a.targetIngredientId}|${a.relationType}`.localeCompare(`${b.sourceIngredientId}|${b.targetIngredientId}|${b.relationType}`);
}
