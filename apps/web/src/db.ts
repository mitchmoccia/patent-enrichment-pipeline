import "server-only";
import { createDb, type Database } from "@patent/db";

let cached: Database | null = null;

/** Shared application-role database handle for services (RLS-enforced). */
export function db(): Database {
  if (!cached) {
    cached = createDb(process.env.DATABASE_URL ?? "").db;
  }
  return cached;
}
