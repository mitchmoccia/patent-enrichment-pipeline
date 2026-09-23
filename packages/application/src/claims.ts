import { randomUUID } from "node:crypto";
import { type Database, schema, withTenant } from "@patent/db";
import {
  assertClaimSet,
  type ClaimDraft,
  type ClaimLimitation,
  RuleError,
  removedLimitations,
  supportCrossesIncompatible,
} from "@patent/domain";
import { and, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

function asDraft(row: {
  id: string;
  category: string;
  dependsOn: string | null;
  connective: string;
  limitations: ClaimLimitation[];
}): ClaimDraft {
  return {
    id: row.id,
    category: row.category === "system" ? "system" : "method",
    dependsOn: row.dependsOn,
    connective: row.connective === "or" ? "or" : "and",
    limitations: row.limitations,
  };
}

export async function saveClaim(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    category: "method" | "system";
    dependsOn: string | null;
    connective: "and" | "or";
    limitations: { text: string; actor: string | null }[];
  },
) {
  assertHumanActor(ctx);
  const limitations = input.limitations
    .map((item) => ({ id: randomUUID(), text: item.text.trim(), actor: item.actor }))
    .filter((item) => item.text);
  if (limitations.length === 0)
    throw new AppError("VALIDATION_FAILED", "a claim needs a limitation");
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const existing = await tx
      .select()
      .from(schema.claimDrafts)
      .where(eq(schema.claimDrafts.matterId, input.matterId));
    const id = randomUUID();
    const draft: ClaimDraft = {
      id,
      category: input.category,
      dependsOn: input.dependsOn,
      connective: input.connective,
      limitations,
    };
    try {
      assertClaimSet([...existing.map(asDraft), draft]);
    } catch (error) {
      blocked(error);
    }
    const [row] = await tx
      .insert(schema.claimDrafts)
      .values({
        id,
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        category: input.category,
        dependsOn: input.dependsOn,
        connective: input.connective,
        limitations,
        supportStatus: "current",
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "claim was not recorded");
    return row;
  });
}

export async function patchClaim(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    claimId: string;
    expectedRevision: number;
    connective?: "and" | "or";
    limitations?: { id: string; text: string; actor: string | null }[];
    dependsOn?: string | null;
    category?: "method" | "system";
  },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const existing = await tx
      .select()
      .from(schema.claimDrafts)
      .where(eq(schema.claimDrafts.matterId, input.matterId));
    const current = existing.find((row) => row.id === input.claimId);
    if (!current) throw new AppError("NOT_FOUND", "claim not found");
    if (current.revision !== input.expectedRevision) {
      throw new AppError("REVISION_CONFLICT", "the claim changed; reload and try again");
    }
    const limitations = input.limitations ?? current.limitations;
    const removed = removedLimitations(current.limitations, limitations);
    const connective = input.connective ?? (current.connective === "or" ? "or" : "and");
    const scopeChanged = connective !== current.connective || removed.length > 0;
    const next: ClaimDraft = {
      ...asDraft(current),
      connective,
      limitations,
      dependsOn: input.dependsOn === undefined ? current.dependsOn : input.dependsOn,
      category: input.category ?? asDraft(current).category,
    };
    try {
      assertClaimSet(existing.map((row) => (row.id === current.id ? next : asDraft(row))));
    } catch (error) {
      blocked(error);
    }
    const supportStatus = scopeChanged ? "stale" : current.supportStatus;
    const [row] = await tx
      .update(schema.claimDrafts)
      .set({
        connective: next.connective,
        limitations: next.limitations,
        dependsOn: next.dependsOn,
        category: next.category,
        revision: current.revision + 1,
        supportStatus,
      })
      .where(eq(schema.claimDrafts.id, current.id))
      .returning();
    if (scopeChanged) {
      await tx
        .update(schema.claimSupport)
        .set({ status: "stale" })
        .where(eq(schema.claimSupport.claimId, current.id));
    }
    await tx
      .update(schema.inventionAnalyses)
      .set({ status: "stale" })
      .where(
        and(
          eq(schema.inventionAnalyses.matterId, input.matterId),
          eq(schema.inventionAnalyses.status, "current"),
        ),
      );
    if (!row) throw new AppError("POLICY_BLOCKED", "claim patch was not recorded");
    return { ...row, removed };
  });
}

export async function markEmbodimentConflict(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; leftEmbodimentId: string; rightEmbodimentId: string },
) {
  assertHumanActor(ctx);
  if (input.leftEmbodimentId === input.rightEmbodimentId) {
    throw new AppError("VALIDATION_FAILED", "a conflict needs two embodiments");
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.embodimentConflicts)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        leftEmbodimentId: input.leftEmbodimentId,
        rightEmbodimentId: input.rightEmbodimentId,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "conflict was not recorded");
    return row;
  });
}

export async function linkClaimSupport(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; claimId: string; limitationId: string; embodimentId: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const support = await tx
      .select()
      .from(schema.claimSupport)
      .where(
        and(
          eq(schema.claimSupport.claimId, input.claimId),
          eq(schema.claimSupport.status, "current"),
        ),
      );
    const conflicts = await tx
      .select()
      .from(schema.embodimentConflicts)
      .where(eq(schema.embodimentConflicts.matterId, input.matterId));
    const embodimentIds = [...support.map((row) => row.embodimentId), input.embodimentId];
    if (
      supportCrossesIncompatible(
        embodimentIds,
        conflicts.map((row) => ({ left: row.leftEmbodimentId, right: row.rightEmbodimentId })),
      )
    ) {
      throw new AppError("POLICY_BLOCKED", "support cannot span incompatible embodiments");
    }
    const [row] = await tx
      .insert(schema.claimSupport)
      .values({ tenantId: ctx.tenantId, ...input, status: "current" })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "support was not recorded");
    return row;
  });
}

export async function getClaims(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const claims = await tx
      .select()
      .from(schema.claimDrafts)
      .where(eq(schema.claimDrafts.matterId, matterId));
    const support = await tx
      .select()
      .from(schema.claimSupport)
      .where(eq(schema.claimSupport.matterId, matterId));
    const conflicts = await tx
      .select()
      .from(schema.embodimentConflicts)
      .where(eq(schema.embodimentConflicts.matterId, matterId));
    return { claims, support, conflicts };
  });
}
