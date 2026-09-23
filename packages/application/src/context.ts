import type { TenantContext } from "@patent/db";

/**
 * The server-derived authorization context for a command/query. Built from the
 * verified session and organization membership — never from client input.
 */
export interface AuthorizedContext extends TenantContext {
  /** Optional capability strings for finer-grained checks (unused in S01). */
  capabilities?: string[];
}
