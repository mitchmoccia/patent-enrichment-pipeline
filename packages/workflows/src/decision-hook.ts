import { createHook } from "workflow";

/**
 * Workflow 4.8.8 resume signal. Import this module only from a workflow worker.
 * The Next.js application path must not import it; Postgres stores the decision.
 */
export function openDecisionHook(token: string) {
  return createHook<{ decisionId: string }>({ token });
}
