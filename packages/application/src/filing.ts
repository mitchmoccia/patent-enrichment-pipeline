import { type Database, schema, withTenant } from "@patent/db";
import {
  assertAmendmentSupported,
  assertCanRecordFiled,
  assertDeadlineContext,
  extractOfficeClaims,
  RuleError,
  reconcileFiles,
} from "@patent/domain";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

async function editor(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  matterId: string,
  userId: string,
) {
  await lockMatter(tx, matterId);
  await requireEditor(tx, matterId, userId);
}

export async function importReceipt(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    applicationNumber: string | null;
    releasedDigest: string;
    submittedDigest: string;
  },
) {
  assertHumanActor(ctx);
  let reconciliation: ReturnType<typeof reconcileFiles>;
  try {
    reconciliation = reconcileFiles(input.releasedDigest, input.submittedDigest);
  } catch (error) {
    blocked(error);
  }
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.filingReceipts)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        applicationNumber: input.applicationNumber,
        releasedDigest: input.releasedDigest,
        submittedDigest: input.submittedDigest,
        reconciliation,
        verified: reconciliation === "matched",
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "receipt was not recorded");
    return { receipt: row, matterState: matter.state };
  });
}

export async function confirmFiled(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; requested: string; viaDownload: boolean; viaCheckbox: boolean },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await editor(tx, input.matterId, ctx.userId);
    const receipts = await tx
      .select()
      .from(schema.filingReceipts)
      .where(eq(schema.filingReceipts.matterId, input.matterId));
    try {
      assertCanRecordFiled({
        actorKind: ctx.actorKind ?? "person",
        receiptVerified: receipts.some((row) => row.verified),
        requested: input.requested,
        viaDownload: input.viaDownload,
        viaCheckbox: input.viaCheckbox,
      });
    } catch (error) {
      blocked(error);
    }
    const [matter] = await tx
      .update(schema.matters)
      .set({ state: "filed" })
      .where(eq(schema.matters.id, input.matterId))
      .returning();
    if (!matter) throw new AppError("POLICY_BLOCKED", "filing status was not recorded");
    return matter;
  });
}

export async function importOfficeAction(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; sourceText: string },
) {
  assertHumanActor(ctx);
  const sourceText = input.sourceText.trim();
  if (!sourceText) throw new AppError("VALIDATION_FAILED", "an office action needs its text");
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.officeActions)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        sourceText,
        claimNumbers: extractOfficeClaims(sourceText),
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "office action was not recorded");
    return { action: row, matterState: matter.state };
  });
}

export async function proposeDeadline(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; source: string; ruleContext: string; proposedDue: string },
) {
  assertHumanActor(ctx);
  try {
    assertDeadlineContext(input.source, input.ruleContext);
  } catch (error) {
    blocked(error);
  }
  return withTenant(db, ctx, async (tx) => {
    await editor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.docketDeadlines)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        source: input.source.trim(),
        ruleContext: input.ruleContext.trim(),
        proposedDue: input.proposedDue.trim(),
        confirmed: false,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "deadline was not recorded");
    return row;
  });
}

export async function confirmDeadline(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; deadlineId: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await editor(tx, input.matterId, ctx.userId);
    const [current] = await tx
      .select()
      .from(schema.docketDeadlines)
      .where(eq(schema.docketDeadlines.id, input.deadlineId));
    if (!current) throw new AppError("NOT_FOUND", "deadline not found");
    try {
      assertDeadlineContext(current.source, current.ruleContext);
    } catch (error) {
      blocked(error);
    }
    const [row] = await tx
      .update(schema.docketDeadlines)
      .set({ confirmed: true })
      .where(eq(schema.docketDeadlines.id, current.id))
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "deadline was not confirmed");
    return row;
  });
}

export async function saveResponse(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; text: string; supportNote: string | null; newlyInvented: boolean },
) {
  assertHumanActor(ctx);
  try {
    assertAmendmentSupported(input);
  } catch (error) {
    blocked(error);
  }
  return withTenant(db, ctx, async (tx) => {
    await editor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.responseDrafts)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        text: input.text.trim(),
        supportNote: input.supportNote?.trim() ?? "",
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "response was not recorded");
    return row;
  });
}

export async function addIdsCandidate(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; label: string },
) {
  assertHumanActor(ctx);
  const label = input.label.trim();
  if (!label) throw new AppError("VALIDATION_FAILED", "an IDS candidate needs a label");
  return withTenant(db, ctx, async (tx) => {
    await editor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.idsCandidates)
      .values({ tenantId: ctx.tenantId, matterId: input.matterId, label, submitted: false })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "IDS candidate was not recorded");
    return row;
  });
}

export async function getFiling(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const receipts = await tx
      .select()
      .from(schema.filingReceipts)
      .where(eq(schema.filingReceipts.matterId, matterId))
      .orderBy(desc(schema.filingReceipts.createdAt));
    const actions = await tx
      .select()
      .from(schema.officeActions)
      .where(eq(schema.officeActions.matterId, matterId));
    const deadlines = await tx
      .select()
      .from(schema.docketDeadlines)
      .where(eq(schema.docketDeadlines.matterId, matterId));
    const responses = await tx
      .select()
      .from(schema.responseDrafts)
      .where(eq(schema.responseDrafts.matterId, matterId));
    const ids = await tx
      .select()
      .from(schema.idsCandidates)
      .where(eq(schema.idsCandidates.matterId, matterId));
    return { state: matter.state, receipts, actions, deadlines, responses, ids };
  });
}
