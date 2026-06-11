import { createDatabaseClient } from '../src/db/client.js';
import { upsertIngredients, type FoodAdditiveInput } from '../src/services/ingredientService.js';

const dataModule = await import(new URL('../../src/data/foodAdditives.js', import.meta.url).href);
const foodAdditives = dataModule.foodAdditives as FoodAdditiveInput[];
const client = createDatabaseClient();

try {
  await upsertIngredients(client.db, foodAdditives);
  console.log(`Seeded ${foodAdditives.length} ingredients`);
} finally {
  await client.pool.end();
}
