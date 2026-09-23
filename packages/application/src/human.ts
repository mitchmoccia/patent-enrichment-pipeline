import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";

/** Models cannot approve, permission, sign, file, or raise a spend cap. */
export function assertHumanActor(ctx: AuthorizedContext): void {
  if (ctx.actorKind === "model") {
    throw new AppError(
      "POLICY_BLOCKED",
      "a model cannot change permissions, budgets, approvals, or filings",
    );
  }
}
