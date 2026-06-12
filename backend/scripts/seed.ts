import { createDatabaseClient } from '../src/db/client.js';
import { upsertGb2760OfficialRecords, upsertIngredients, type FoodAdditiveInput, type Gb2760OfficialRecordInput } from '../src/services/ingredientService.js';

const dataModule = await import(new URL('../../src/data/foodAdditives.js', import.meta.url).href);
const gb2760StagingModule = await import(new URL('../../src/data/gb2760OfficialStaging.js', import.meta.url).href);
const foodAdditives = resolveFoodSeedItems(dataModule as unknown as FoodDataModule);
const gb2760OfficialRecords = resolveGb2760StagingRecords(gb2760StagingModule as unknown as Gb2760StagingModule);
const client = createDatabaseClient();
const options = parseSeedOptions(process.argv.slice(2));

try {
  await upsertIngredients(client.db, foodAdditives, options);
  await upsertGb2760OfficialRecords(client.db, gb2760OfficialRecords);
  const version = options.dataVersion || foodAdditives[0]?.dataVersion || 'unknown';
  console.log(`Seeded ${foodAdditives.length} ingredients for data version ${version}`);
  console.log(`Seeded ${gb2760OfficialRecords.length} GB 2760 official staging records`);
} finally {
  await client.pool.end();
}

type FoodDataModule = {
  foodIngredients?: unknown;
  foodAdditives?: unknown;
};

type Gb2760StagingModule = {
  gb2760OfficialStagingRecords?: unknown;
};

function resolveFoodSeedItems(module: FoodDataModule): FoodAdditiveInput[] {
  if (Array.isArray(module.foodIngredients)) return module.foodIngredients as FoodAdditiveInput[];
  if (Array.isArray(module.foodAdditives)) return module.foodAdditives as FoodAdditiveInput[];

  throw new Error('Expected src/data/foodAdditives.js to export foodIngredients or foodAdditives array');
}

function resolveGb2760StagingRecords(module: Gb2760StagingModule): Gb2760OfficialRecordInput[] {
  if (Array.isArray(module.gb2760OfficialStagingRecords)) {
    return module.gb2760OfficialStagingRecords as Gb2760OfficialRecordInput[];
  }

  throw new Error('Expected src/data/gb2760OfficialStaging.js to export gb2760OfficialStagingRecords array');
}

function parseSeedOptions(args: string[]) {
  const dataVersion = readOption(args, '--version');
  const hasReviewedBy = hasOption(args, '--reviewed-by');
  const hasChangeNote = hasOption(args, '--change-note');
  const reviewedBy = readOption(args, '--reviewed-by') || 'system';
  const changeNote = readOption(args, '--change-note') || (dataVersion ? `Seed import for ${dataVersion}` : undefined);
  return {
    ...(dataVersion ? { dataVersion } : {}),
    reviewedBy,
    reviewedAt: new Date(),
    ...(changeNote ? { changeNote } : {}),
    updateAuditFields: hasReviewedBy || hasChangeNote
  };
}

function hasOption(args: string[], name: string) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function readOption(args: string[], name: string) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
}
