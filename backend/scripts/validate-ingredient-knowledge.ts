import { createDatabaseClient } from '../src/db/client.js';
import { getConfig } from '../src/config.js';
import { getIngredientKnowledgeDbStats } from '../src/services/ingredientKnowledgeService.js';
import {
  assertDatasetValid,
  assertLocalDatabaseUrl,
  loadIngredientKnowledgeDataset,
  printDatasetSummary
} from './ingredient-knowledge-common.js';
import { getOfficialDataDbStats } from './ingredient-official-data-pipeline.js';

const useDb = !process.argv.includes('--no-db');
let client: ReturnType<typeof createDatabaseClient> | null = null;

try {
  if (useDb) {
    const config = getConfig();
    assertLocalDatabaseUrl(config.databaseUrl);
    client = createDatabaseClient(config.databaseUrl);
  }
  const dataset = await loadIngredientKnowledgeDataset(client?.db);
  assertDatasetValid(dataset);
  if (dataset.conflictReport.length > 0) {
    console.log('Alias conflict report:');
    console.log(JSON.stringify(dataset.conflictReport.slice(0, 50), null, 2));
  }
  printDatasetSummary(dataset);
  if (client) {
    console.log('Database stats:');
    console.log(JSON.stringify(await getIngredientKnowledgeDbStats(client.db), null, 2));
    console.log('Official source-materials stats:');
    console.log(JSON.stringify(await getOfficialDataDbStats(client.pool), null, 2));
  }
  console.log('Ingredient knowledge validation passed.');
} finally {
  if (client) await client.pool.end();
}
