import { sql } from "drizzle-orm";
import type { Database } from "./client.js";

/**
 * The minimal identity a query runs under. Derived by the server from the
 * verified session — never from client input or a model tool argument.
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
}

export type TenantTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Run `fn` inside a single transaction with transaction-local RLS context set.
 * `set_config(..., true)` is the SET LOCAL form, so the tenant/user identity is
 * scoped to this transaction and cannot leak across pooled connections.
 */
export async function withTenant<T>(
  db: Database,
  ctx: TenantContext,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`select set_config('app.user_id', ${ctx.userId}, true)`);
    return fn(tx);
  });
}
