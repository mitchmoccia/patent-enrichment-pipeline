import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;

/**
 * Create a connection pool. We use the node-postgres (pg) driver rather than the
 * Neon HTTP driver because RLS relies on transaction-local settings, which
 * require all statements to run on one pinned session/transaction.
 */
export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: 10,
    ssl: connectionString.includes("sslmode=") ? { rejectUnauthorized: true } : undefined,
  });
}

export function createDb(connectionString: string): { db: Database; pool: pg.Pool } {
  const pool = createPool(connectionString);
  const db = drizzle(pool, { schema });
  return { db, pool };
}
