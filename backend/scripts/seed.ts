import { createDatabaseClient } from '../src/db/client.js';
import { upsertIngredients, type FoodAdditiveInput } from '../src/services/ingredientService.js';

const dataModule = await import(new URL('../../src/data/foodAdditives.js', import.meta.url).href);
const foodAdditives = (dataModule.foodIngredients ?? dataModule.foodAdditives) as FoodAdditiveInput[];
const client = createDatabaseClient();
const options = parseSeedOptions(process.argv.slice(2));

try {
  await upsertIngredients(client.db, foodAdditives, options);
  const version = options.dataVersion || foodAdditives[0]?.dataVersion || 'unknown';
  console.log(`Seeded ${foodAdditives.length} ingredients for data version ${version}`);
} finally {
  await client.pool.end();
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
