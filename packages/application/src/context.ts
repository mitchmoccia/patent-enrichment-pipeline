import type { TenantContext } from "@patent/db";

/**
 * The server-derived authorization context for a command/query. Built from the
 * verified session and organization membership — never from client input.
 */
export interface AuthorizedContext extends TenantContext {
  /** Optional capability strings for finer-grained checks. */
  capabilities?: string[];
  /**
   * Who is acting. A model cannot change permissions, budgets, gates, or filings.
   * Omitted means a person (the verified session).
   */
  actorKind?: "person" | "model";
}
