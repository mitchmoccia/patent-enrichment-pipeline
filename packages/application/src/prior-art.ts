import { type Database, schema, withTenant } from "@patent/db";
import { assessEligibility, assessFinding, RuleError } from "@patent/domain";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

const kinds = ["anticipation", "obviousness", "technical_similarity"] as const;

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

async function criticalDate(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  matterId: string,
): Promise<string | null> {
  const events = await tx
    .select()
    .from(schema.chronologyEvents)
    .where(eq(schema.chronologyEvents.matterId, matterId));
  const dates = events
    .filter(
      (event) =>
        event.precision === "day" && (event.kind === "disclosure" || event.kind === "filing"),
    )
    .map((event) => event.eventDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

export async function addLimitation(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; text: string },
) {
  assertHumanActor(ctx);
  const text = input.text.trim();
  if (!text) throw new AppError("VALIDATION_FAILED", "a limitation needs text");
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.claimLimitations)
      .values({ tenantId: ctx.tenantId, matterId: input.matterId, text })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "limitation was not recorded");
    return row;
  });
}

export async function recordFinding(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    limitationId: string;
    kind: string;
    referenceIds: string[];
    quote: string;
    motivation: string | null;
  },
) {
  assertHumanActor(ctx);
  if (!kinds.includes(input.kind as (typeof kinds)[number])) {
    throw new AppError("VALIDATION_FAILED", "unknown finding kind");
  }
  const kind = input.kind as (typeof kinds)[number];
  const quote = input.quote.trim();
  if (!quote || input.referenceIds.length === 0) {
    throw new AppError("VALIDATION_FAILED", "a finding needs a quote and a reference");
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [limitation] = await tx
      .select()
      .from(schema.claimLimitations)
      .where(
        and(
          eq(schema.claimLimitations.id, input.limitationId),
          eq(schema.claimLimitations.matterId, input.matterId),
        ),
      );
    if (!limitation) throw new AppError("NOT_FOUND", "limitation not found");
    const references = await tx
      .select()
      .from(schema.importedReferences)
      .where(
        and(
          eq(schema.importedReferences.matterId, input.matterId),
          inArray(schema.importedReferences.id, input.referenceIds),
        ),
      );
    if (references.length !== input.referenceIds.length) {
      throw new AppError("NOT_FOUND", "a cited reference is not in this matter");
    }
    const decision = assessFinding({
      kind,
      criticalDate: await criticalDate(tx, input.matterId),
      motivation: input.motivation,
      quotes: references.map((reference) => ({
        quote,
        sourceText: reference.fullText ?? reference.passage,
        fullTextStatus: reference.fullTextStatus === "available" ? "available" : "unavailable",
        disclosureDate: reference.publicationDate,
      })),
    });
    const [row] = await tx
      .insert(schema.priorArtFindings)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        limitationId: limitation.id,
        kind,
        legalStatus: decision.legalStatus,
        reason: decision.reason,
        relevance: decision.relevance,
        quote,
        motivation: input.motivation,
        referenceIds: input.referenceIds,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "finding was not recorded");
    return row;
  });
}

export async function recordEligibility(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; limitationId: string; answer: string },
) {
  assertHumanActor(ctx);
  const answer = input.answer.trim();
  if (!answer) throw new AppError("VALIDATION_FAILED", "an eligibility answer needs text");
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [limitation] = await tx
      .select()
      .from(schema.claimLimitations)
      .where(
        and(
          eq(schema.claimLimitations.id, input.limitationId),
          eq(schema.claimLimitations.matterId, input.matterId),
        ),
      );
    if (!limitation) throw new AppError("NOT_FOUND", "limitation not found");
    let decision: ReturnType<typeof assessEligibility>;
    try {
      decision = assessEligibility(answer, [limitation.text]);
    } catch (error) {
      blocked(error);
    }
    const [row] = await tx
      .insert(schema.eligibilityReviews)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        limitationId: limitation.id,
        answer,
        legalStatus: decision.legalStatus,
        reason: decision.reason,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "eligibility review was not recorded");
    return row;
  });
}

export async function getPriorArt(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const limitations = await tx
      .select()
      .from(schema.claimLimitations)
      .where(eq(schema.claimLimitations.matterId, matterId))
      .orderBy(asc(schema.claimLimitations.createdAt));
    const findings = await tx
      .select()
      .from(schema.priorArtFindings)
      .where(eq(schema.priorArtFindings.matterId, matterId));
    const eligibility = await tx
      .select()
      .from(schema.eligibilityReviews)
      .where(eq(schema.eligibilityReviews.matterId, matterId));
    const references = await tx
      .select()
      .from(schema.importedReferences)
      .where(eq(schema.importedReferences.matterId, matterId));
    return { limitations, findings, eligibility, references };
  });
}
