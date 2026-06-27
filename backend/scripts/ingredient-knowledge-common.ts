import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  buildIngredientKnowledgeDataset,
  getFormalGb2760RuleSourceIds,
  summarizeIngredientKnowledgeDataset,
  validateIngredientKnowledgeDataset,
  type Gb2760KnowledgeSourceMetadata,
  type IngredientKnowledgeDataset
} from '../src/services/ingredientKnowledgeService.js';
import type { Database } from '../src/db/client.js';
import type { FoodAdditiveInput, Gb2760OfficialRecordInput, Gb2760OfficialReferenceRowInput } from '../src/services/ingredientService.js';

export type IngredientOfficialSourceManifestItem = {
  id: string;
  sourceOrg: string;
  sourceType: string;
  standardNo: string;
  announcementNo: string;
  title: string;
  sourceUrl: string;
  publicationDate: string;
  effectiveDate: string;
  retrievedAt: string;
  contentHash: string;
  parserVersion: string;
  platformRecordId: string;
  announcementRecordId: string;
  downloadEndpoint: string;
  downloadTask: string;
  fileGuid: string;
  factName: string;
  localDerivedModules: string[];
};

type FoodDataModule = {
  foodIngredients?: unknown;
  foodAdditives?: unknown;
};

type Gb2760StagingModule = {
  gb2760OfficialStagingSource?: unknown;
  gb2760OfficialStagingRecords?: unknown;
};

type Gb2760ReferenceTableModule = {
  gb2760OfficialReferenceRows?: unknown;
};

export async function loadIngredientKnowledgeDataset(db?: Database): Promise<IngredientKnowledgeDataset> {
  const [foodModule, stagingModule, referenceModule] = await Promise.all([
    import(new URL('../src/data/foodAdditives.js', import.meta.url).href),
    import(new URL('../src/data/gb2760OfficialStaging.js', import.meta.url).href),
    import(new URL('../src/data/gb2760OfficialReferenceTables.js', import.meta.url).href)
  ]);
  const formalRuleSourceIds = db ? await getFormalGb2760RuleSourceIds(db) : undefined;
  return buildIngredientKnowledgeDataset({
    foodIngredients: resolveFoodSeedItems(foodModule as FoodDataModule),
    gb2760Records: resolveGb2760StagingRecords(stagingModule as Gb2760StagingModule),
    gb2760ReferenceRows: resolveGb2760ReferenceRows(referenceModule as Gb2760ReferenceTableModule),
    gb2760Source: resolveGb2760SourceMetadata(stagingModule as Gb2760StagingModule),
    formalRuleSourceIds
  });
}

export function assertDatasetValid(dataset: IngredientKnowledgeDataset) {
  const errors = validateIngredientKnowledgeDataset(dataset);
  if (errors.length > 0) {
    throw new Error(`Ingredient knowledge validation failed:\n${errors.slice(0, 80).join('\n')}`);
  }
}

export function printDatasetSummary(dataset: IngredientKnowledgeDataset) {
  const summary = summarizeIngredientKnowledgeDataset(dataset);
  console.log(JSON.stringify(summary, null, 2));
}

export function assertLocalDatabaseUrl(databaseUrl: string) {
  if (process.env.ALLOW_NON_LOCAL_INGREDIENT_IMPORT === '1') return;
  const parsed = new URL(databaseUrl);
  const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`Refusing to import ingredient knowledge into non-local database host "${parsed.hostname}". Set ALLOW_NON_LOCAL_INGREDIENT_IMPORT=1 only after manual confirmation.`);
  }
}

export async function readOfficialSourceManifest() {
  const path = fileURLToPath(new URL('../config/ingredient-official-sources.json', import.meta.url));
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('ingredient-official-sources.json must be an array');
  }
  return parsed as IngredientOfficialSourceManifestItem[];
}

function resolveFoodSeedItems(module: FoodDataModule): FoodAdditiveInput[] {
  if (Array.isArray(module.foodIngredients)) return module.foodIngredients as FoodAdditiveInput[];
  if (Array.isArray(module.foodAdditives)) return module.foodAdditives as FoodAdditiveInput[];
  throw new Error('Expected backend/src/data/foodAdditives.js to export foodIngredients or foodAdditives array');
}

function resolveGb2760StagingRecords(module: Gb2760StagingModule): Gb2760OfficialRecordInput[] {
  if (Array.isArray(module.gb2760OfficialStagingRecords)) {
    return module.gb2760OfficialStagingRecords as Gb2760OfficialRecordInput[];
  }
  throw new Error('Expected backend/src/data/gb2760OfficialStaging.js to export gb2760OfficialStagingRecords array');
}

function resolveGb2760ReferenceRows(module: Gb2760ReferenceTableModule): Gb2760OfficialReferenceRowInput[] {
  if (Array.isArray(module.gb2760OfficialReferenceRows)) {
    return module.gb2760OfficialReferenceRows as Gb2760OfficialReferenceRowInput[];
  }
  throw new Error('Expected backend/src/data/gb2760OfficialReferenceTables.js to export gb2760OfficialReferenceRows array');
}

function resolveGb2760SourceMetadata(module: Gb2760StagingModule): Gb2760KnowledgeSourceMetadata {
  const source = module.gb2760OfficialStagingSource;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Expected backend/src/data/gb2760OfficialStaging.js to export gb2760OfficialStagingSource object');
  }
  return {
    sourceName: readRequiredSourceField(source, 'sourceName'),
    sourceType: readRequiredSourceField(source, 'sourceType'),
    sourceUrl: readRequiredSourceField(source, 'sourceUrl'),
    standardCode: readRequiredSourceField(source, 'standardCode'),
    standardTitle: readRequiredSourceField(source, 'standardTitle'),
    publishedAt: readRequiredSourceField(source, 'publishedAt'),
    effectiveDate: readRequiredSourceField(source, 'effectiveDate'),
    retrievedAt: readRequiredSourceField(source, 'retrievedAt'),
    platformRecordId: readRequiredSourceField(source, 'platformRecordId'),
    announcementRecordId: readRequiredSourceField(source, 'announcementRecordId'),
    fileGuid: readRequiredSourceField(source, 'fileGuid'),
    factName: readRequiredSourceField(source, 'factName'),
    pdfSha256: readRequiredSourceField(source, 'pdfSha256')
  };
}

function readRequiredSourceField(source: object, field: keyof Gb2760KnowledgeSourceMetadata) {
  const value = (source as Record<string, unknown>)[field];
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Missing GB 2760 source metadata field: ${field}`);
  }
  return normalized;
}
