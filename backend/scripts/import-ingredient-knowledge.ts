import { createDatabaseClient } from '../src/db/client.js';
import { getConfig } from '../src/config.js';
import {
  getIngredientKnowledgeDbStats,
  importIngredientKnowledgeDataset
} from '../src/services/ingredientKnowledgeService.js';
import {
  assertDatasetValid,
  assertLocalDatabaseUrl,
  loadIngredientKnowledgeDataset,
  printDatasetSummary
} from './ingredient-knowledge-common.js';
import { importPipelineToLocalDatabase } from './ingredient-official-data-pipeline.js';

const config = getConfig();
assertLocalDatabaseUrl(config.databaseUrl);

const client = createDatabaseClient(config.databaseUrl);

try {
  const dataset = await loadIngredientKnowledgeDataset(client.db);
  assertDatasetValid(dataset);
  await importIngredientKnowledgeDataset(client.db, dataset);
  await importPipelineToLocalDatabase();
  const stats = await getIngredientKnowledgeDbStats(client.db);
  console.log('Imported ingredient knowledge dataset.');
  printDatasetSummary(dataset);
  console.log('Database stats:');
  console.log(JSON.stringify(stats, null, 2));
} finally {
  await client.pool.end();
}
