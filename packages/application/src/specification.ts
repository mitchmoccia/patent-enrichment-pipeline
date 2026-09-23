import { type Database, schema, withTenant } from "@patent/db";
import {
  assertCleanSection,
  assertNumericalClaim,
  figureDisagreement,
  hypotheticalStatus,
  RuleError,
} from "@patent/domain";
import { and, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

const kinds = ["abstract", "description", "claims"] as const;

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

export async function saveSection(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    kind: string;
    text: string;
    hypothetical: boolean;
    evidenceNote: string | null;
  },
) {
  assertHumanActor(ctx);
  if (!kinds.includes(input.kind as (typeof kinds)[number])) {
    throw new AppError("VALIDATION_FAILED", "unknown section");
  }
  const kind = input.kind as (typeof kinds)[number];
  const text = input.text.trim();
  if (!text) throw new AppError("VALIDATION_FAILED", "a section needs text");
  try {
    assertCleanSection(kind, text);
    assertNumericalClaim(kind, text, input.evidenceNote);
  } catch (error) {
    blocked(error);
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const figures = await tx
      .select()
      .from(schema.specificationFigures)
      .where(eq(schema.specificationFigures.matterId, input.matterId));
    const disagreement = figureDisagreement(text, figures);
    if (disagreement) throw new AppError("POLICY_BLOCKED", disagreement);
    const [existing] = await tx
      .select()
      .from(schema.specificationSections)
      .where(
        and(
          eq(schema.specificationSections.matterId, input.matterId),
          eq(schema.specificationSections.kind, kind),
        ),
      );
    const hypothetical = hypotheticalStatus(text, input.hypothetical);
    const changed = Boolean(existing && existing.text !== text);
    const revision = existing ? existing.revision + (changed ? 1 : 0) : 1;
    const [row] = existing
      ? await tx
          .update(schema.specificationSections)
          .set({ text, hypothetical, evidenceNote: input.evidenceNote, revision })
          .where(eq(schema.specificationSections.id, existing.id))
          .returning()
      : await tx
          .insert(schema.specificationSections)
          .values({
            tenantId: ctx.tenantId,
            matterId: input.matterId,
            kind,
            text,
            hypothetical,
            evidenceNote: input.evidenceNote,
            revision,
          })
          .returning();
    if (changed && kind === "description") {
      await tx
        .update(schema.claimSupport)
        .set({ status: "stale" })
        .where(eq(schema.claimSupport.matterId, input.matterId));
    }
    if (!row) throw new AppError("POLICY_BLOCKED", "section was not recorded");
    return row;
  });
}

export async function saveFigure(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; numeral: string; label: string; description: string },
) {
  assertHumanActor(ctx);
  const numeral = input.numeral.trim();
  const label = input.label.trim();
  const description = input.description.trim();
  if (!numeral || !label || !description) {
    throw new AppError("VALIDATION_FAILED", "a figure needs a numeral, label, and description");
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.specificationFigures)
      .values({ tenantId: ctx.tenantId, matterId: input.matterId, numeral, label, description })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "figure was not recorded");
    return row;
  });
}

export async function saveTerm(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; term: string; definition: string },
) {
  assertHumanActor(ctx);
  const term = input.term.trim();
  const definition = input.definition.trim();
  if (!term || !definition) throw new AppError("VALIDATION_FAILED", "a term needs a definition");
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.terminology)
      .values({ tenantId: ctx.tenantId, matterId: input.matterId, term, definition })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "term was not recorded");
    return row;
  });
}

export async function getSpecification(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const sections = await tx
      .select()
      .from(schema.specificationSections)
      .where(eq(schema.specificationSections.matterId, matterId));
    const figures = await tx
      .select()
      .from(schema.specificationFigures)
      .where(eq(schema.specificationFigures.matterId, matterId));
    const terms = await tx
      .select()
      .from(schema.terminology)
      .where(eq(schema.terminology.matterId, matterId));
    return { sections, figures, terms };
  });
}
