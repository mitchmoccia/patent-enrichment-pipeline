import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client";

const here = dirname(fileURLToPath(import.meta.url));
// Load the workspace-root .env (packages/db/src -> workspace root).
config({ path: join(here, "..", "..", "..", ".env") });

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
  throw new Error("DATABASE_MIGRATION_URL is required to run migrations");
}

const { db, pool } = createDb(url);

async function main(): Promise<void> {
  console.log("Applying Drizzle migrations...");
  await migrate(db, { migrationsFolder: join(here, "..", "drizzle") });
  console.log("Applying RLS policies and grants...");
  const rls = readFileSync(join(here, "..", "sql", "rls.sql"), "utf8");
  await pool.query(rls);
  await pool.end();
  console.log("Migrations + RLS applied successfully.");
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
