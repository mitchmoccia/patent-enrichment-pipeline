import type { Database } from "@patent/db";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { updateMatterGoal } from "./matter-edits";
import { getMatter, revokeMatterMember } from "./matters";
import { assertMfaEnrolled } from "./mfa";

export interface RevokeInput {
  matterId: string;
  principalId: string;
  mfaEnabled: boolean;
}

export interface GoalInput {
  matterId: string;
  goal: string;
  expectedRevision: number;
  mfaEnabled: boolean;
}

export type TransportResult =
  | { status: 200; body: { ok: true } }
  | { status: 403; body: { code: "UNAUTHORIZED" | "POLICY_BLOCKED"; message: string } }
  | { status: 409; body: { code: "REVISION_CONFLICT"; message: string } };

function asResult(error: unknown): TransportResult {
  if (error instanceof AppError && error.code === "REVISION_CONFLICT") {
    return { status: 409, body: { code: error.code, message: error.message } };
  }
  if (
    error instanceof AppError &&
    (error.code === "UNAUTHORIZED" || error.code === "POLICY_BLOCKED")
  ) {
    return { status: 403, body: { code: error.code, message: error.message } };
  }
  throw error;
}

/**
 * Server Action path. Checks MFA, then re-reads the matter under the caller's
 * RLS context. A revoked principal fails here even if a proxy already ran.
 */
export async function serverActionRevokeMember(
  db: Database,
  ctx: AuthorizedContext,
  input: RevokeInput,
): Promise<void> {
  assertMfaEnrolled(input.mfaEnabled);
  const visible = await getMatter(db, ctx, input.matterId);
  if (!visible) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
  await revokeMatterMember(db, ctx, input.matterId, input.principalId);
}

/**
 * Route Handler path. Independent of the Server Action function above.
 * Same rejection for a revoked principal and for a session without MFA.
 */
export async function routeHandlerRevokeMember(
  db: Database,
  ctx: AuthorizedContext,
  input: RevokeInput,
): Promise<TransportResult> {
  try {
    if (!input.mfaEnabled) {
      throw new AppError("POLICY_BLOCKED", "enroll a second factor before changing a matter");
    }
    const visible = await getMatter(db, ctx, input.matterId);
    if (!visible) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
    await revokeMatterMember(db, ctx, input.matterId, input.principalId);
    return { status: 200, body: { ok: true } };
  } catch (error) {
    return asResult(error);
  }
}

export async function serverActionUpdateGoal(
  db: Database,
  ctx: AuthorizedContext,
  input: GoalInput,
): Promise<{ revision: number }> {
  assertMfaEnrolled(input.mfaEnabled);
  const visible = await getMatter(db, ctx, input.matterId);
  if (!visible) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
  return updateMatterGoal(db, ctx, input);
}

export async function routeHandlerUpdateGoal(
  db: Database,
  ctx: AuthorizedContext,
  input: GoalInput,
): Promise<TransportResult | { status: 200; body: { revision: number } }> {
  try {
    if (!input.mfaEnabled) {
      throw new AppError("POLICY_BLOCKED", "enroll a second factor before changing a matter");
    }
    const visible = await getMatter(db, ctx, input.matterId);
    if (!visible) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
    const saved = await updateMatterGoal(db, ctx, input);
    return { status: 200, body: saved };
  } catch (error) {
    return asResult(error);
  }
}
