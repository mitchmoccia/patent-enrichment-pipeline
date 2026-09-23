import { createHash } from "node:crypto";
import { type Database, schema, withTenant } from "@patent/db";
import {
  assertCurrentRule,
  assertFilingCoversEmbodiment,
  assertSelfFilerRelease,
  RuleError,
  ruleAlert,
} from "@patent/domain";
import { and, desc, eq } from "drizzle-orm";
import { canonicalJson } from "./canonical";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

const contributionRoles = ["inventor", "applicant", "owner", "assignment_obligation"] as const;
const eventKinds = ["disclosure", "sale", "filing"] as const;
const precisions = ["day", "month", "year", "unknown"] as const;

type ContributionRole = (typeof contributionRoles)[number];
type EventKind = (typeof eventKinds)[number];
type DatePrecision = (typeof precisions)[number];

function asBlocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

function assertMember<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new AppError("VALIDATION_FAILED", `unknown ${label}`);
  return value as T;
}

function assertChronologyDate(precision: DatePrecision, eventDate: string | null): string | null {
  if (precision === "unknown") {
    if (eventDate) {
      throw new AppError("VALIDATION_FAILED", "an unknown date cannot carry a calendar value");
    }
    return null;
  }
  const pattern =
    precision === "day"
      ? /^\d{4}-\d{2}-\d{2}$/
      : precision === "month"
        ? /^\d{4}-\d{2}$/
        : /^\d{4}$/;
  if (!eventDate || !pattern.test(eventDate)) {
    throw new AppError("VALIDATION_FAILED", "the date does not match its precision");
  }
  return eventDate;
}

async function snapshot(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  tenantId: string,
  matterId: string,
  revision: number,
  payload: unknown,
) {
  const [parent] = await tx
    .select({ id: schema.matterSnapshots.id })
    .from(schema.matterSnapshots)
    .where(eq(schema.matterSnapshots.matterId, matterId))
    .orderBy(desc(schema.matterSnapshots.revision))
    .limit(1);
  await tx.insert(schema.matterSnapshots).values({
    tenantId,
    matterId,
    revision,
    digest: createHash("sha256").update(canonicalJson(payload)).digest("hex"),
    parentSnapshotId: parent?.id,
  });
}

async function bump(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  tenantId: string,
  matterId: string,
  revision: number,
  payload: unknown,
) {
  await tx
    .update(schema.matters)
    .set({ headRevision: revision })
    .where(eq(schema.matters.id, matterId));
  await snapshot(tx, tenantId, matterId, revision, payload);
}

export async function addContribution(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; role: string; personLabel: string; account: string },
) {
  assertHumanActor(ctx);
  const role = assertMember(input.role, contributionRoles, "contribution role");
  const personLabel = input.personLabel.trim();
  const account = input.account.trim();
  if (!personLabel || !account)
    throw new AppError("VALIDATION_FAILED", "a contribution needs a person and an account");
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.contributions)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        role,
        personLabel,
        account,
        legalInventorship: "unresolved",
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "contribution was not recorded");
    return row;
  });
}

export async function addChronologyEvent(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    kind: string;
    precision: string;
    eventDate: string | null;
    note: string;
  },
) {
  assertHumanActor(ctx);
  const kind = assertMember(input.kind, eventKinds, "chronology kind");
  const precision = assertMember(input.precision, precisions, "date precision");
  const eventDate = assertChronologyDate(precision, input.eventDate?.trim() || null);
  const note = input.note.trim();
  if (!note) throw new AppError("VALIDATION_FAILED", "a chronology event needs a note");
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.chronologyEvents)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        kind,
        precision,
        eventDate,
        note,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "chronology event was not recorded");
    const revision = matter.headRevision + 1;
    await bump(tx, ctx.tenantId, matter.id, revision, { kind: "chronology", eventId: row.id });
    return { ...row, revision };
  });
}

export async function addEmbodiment(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; label: string; developedOn: string },
) {
  assertHumanActor(ctx);
  const label = input.label.trim();
  if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(input.developedOn)) {
    throw new AppError("VALIDATION_FAILED", "an embodiment needs a label and a day-precision date");
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.embodiments)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        label,
        developedOn: input.developedOn,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "embodiment was not recorded");
    return row;
  });
}

export async function assignFilingDate(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; embodimentId: string; filingOn: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [embodiment] = await tx
      .select()
      .from(schema.embodiments)
      .where(eq(schema.embodiments.id, input.embodimentId));
    if (!embodiment || embodiment.matterId !== input.matterId) {
      throw new AppError("NOT_FOUND", "embodiment not found");
    }
    try {
      assertFilingCoversEmbodiment(embodiment.developedOn, input.filingOn);
    } catch (error) {
      asBlocked(error);
    }
    await tx
      .update(schema.embodiments)
      .set({ filingOn: input.filingOn })
      .where(eq(schema.embodiments.id, embodiment.id));
    const revision = matter.headRevision + 1;
    await bump(tx, ctx.tenantId, matter.id, revision, {
      kind: "filing_date",
      embodimentId: embodiment.id,
      filingOn: input.filingOn,
    });
    return { filingOn: input.filingOn, revision };
  });
}

export async function selectCurrentRule(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; sourceKey: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [source] = await tx
      .select()
      .from(schema.legalSources)
      .where(eq(schema.legalSources.sourceKey, input.sourceKey));
    if (!source) throw new AppError("NOT_FOUND", "legal source is not in the register");
    try {
      assertCurrentRule(source);
    } catch (error) {
      asBlocked(error);
    }
    const [existing] = await tx
      .select()
      .from(schema.matterRules)
      .where(
        and(
          eq(schema.matterRules.matterId, input.matterId),
          eq(schema.matterRules.sourceKey, source.sourceKey),
        ),
      );
    const row =
      existing ??
      (
        await tx
          .insert(schema.matterRules)
          .values({
            tenantId: ctx.tenantId,
            matterId: input.matterId,
            sourceKey: source.sourceKey,
            status: "current",
          })
          .returning()
      )[0];
    if (!row) throw new AppError("POLICY_BLOCKED", "rule selection was not recorded");
    const revision = matter.headRevision + 1;
    await bump(tx, ctx.tenantId, matter.id, revision, {
      kind: "rule",
      sourceKey: source.sourceKey,
      counselApproved: false,
    });
    return { sourceKey: source.sourceKey, status: row.status, revision, alert: ruleAlert(source) };
  });
}

export async function promoteRule(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; sourceKey: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [source] = await tx
      .select()
      .from(schema.legalSources)
      .where(eq(schema.legalSources.sourceKey, input.sourceKey));
    if (!source) throw new AppError("NOT_FOUND", "legal source is not in the register");
    if (source.supersededBy) {
      throw new AppError("POLICY_BLOCKED", "superseded guidance cannot be promoted as current");
    }
    await tx
      .update(schema.legalSources)
      .set({ reviewStatus: "promoted" })
      .where(eq(schema.legalSources.sourceKey, source.sourceKey));
    return {
      sourceKey: source.sourceKey,
      reviewStatus: "promoted" as const,
      counselApproved: false as const,
      signed: false,
      alert: ruleAlert({ supersededBy: null, reviewStatus: "promoted" }),
    };
  });
}

export async function chooseSelfFiler(db: Database, ctx: AuthorizedContext, matterId: string) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, matterId);
    await requireEditor(tx, matterId, ctx.userId);
    try {
      assertSelfFilerRelease(matter.applicantMode);
    } catch (error) {
      asBlocked(error);
    }
    const [existing] = await tx
      .select()
      .from(schema.releaseChoices)
      .where(eq(schema.releaseChoices.matterId, matterId));
    const row =
      existing ??
      (
        await tx
          .insert(schema.releaseChoices)
          .values({ tenantId: ctx.tenantId, matterId, label: "self-filer" })
          .returning()
      )[0];
    if (row?.label !== "self-filer") {
      throw new AppError("POLICY_BLOCKED", "self-filer release was not recorded");
    }
    return { label: "self-filer" as const };
  });
}

export async function getRights(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const contributions = await tx
      .select()
      .from(schema.contributions)
      .where(eq(schema.contributions.matterId, matterId));
    const events = await tx
      .select()
      .from(schema.chronologyEvents)
      .where(eq(schema.chronologyEvents.matterId, matterId));
    const embodiments = await tx
      .select()
      .from(schema.embodiments)
      .where(eq(schema.embodiments.matterId, matterId));
    const selected = await tx
      .select()
      .from(schema.matterRules)
      .where(eq(schema.matterRules.matterId, matterId));
    const sources = await tx.select().from(schema.legalSources);
    const [release] = await tx
      .select()
      .from(schema.releaseChoices)
      .where(eq(schema.releaseChoices.matterId, matterId));
    const rules = selected.map((rule) => {
      const source = sources.find((item) => item.sourceKey === rule.sourceKey);
      return {
        ...rule,
        title: source?.title ?? rule.sourceKey,
        supersededBy: source?.supersededBy ?? null,
        counselApproved: false as const,
        alert: source ? ruleAlert(source) : "missing source",
      };
    });
    return {
      applicantMode: matter.applicantMode,
      revision: matter.headRevision,
      contributions,
      events,
      embodiments,
      rules,
      sources: sources.map((source) => ({
        ...source,
        counselApproved: false as const,
        alert: ruleAlert(source),
      })),
      release: release ? { label: release.label } : null,
    };
  });
}

export type { ContributionRole, DatePrecision, EventKind };
