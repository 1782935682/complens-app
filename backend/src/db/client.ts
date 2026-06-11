import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getConfig } from '../config.js';
import * as schema from './schema.js';

const { Pool } = pg;

export type Database = NodePgDatabase<typeof schema>;

export type DatabaseClient = {
  db: Database;
  pool: pg.Pool;
};

export function createDatabaseClient(databaseUrl = getConfig().databaseUrl): DatabaseClient {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    db: drizzle(pool, { schema }),
    pool
  };
}
