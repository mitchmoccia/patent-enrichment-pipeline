import { type Database, schema, withTenant } from "@patent/db";
import {
  adapterHealth,
  disclosureDate,
  passageOf,
  type ResearchEnv,
  rankImports,
} from "@patent/research";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

const stopReason =
  "External patent offices were not called. Their endpoint contracts are not verified, so a missing or rejected key is not zero matches.";

export async function importReference(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    title: string;
    publicationNumber?: string;
    publicationDate: string | null;
    familyDate: string | null;
    fullText: string | null;
    passage: string | null;
  },
) {
  assertHumanActor(ctx);
  const title = input.title.trim();
  if (!title) throw new AppError("VALIDATION_FAILED", "a reference needs a title");
  const fullText = input.fullText?.trim() || null;
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.importedReferences)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        title,
        publicationNumber: input.publicationNumber?.trim() || null,
        publicationDate: input.publicationDate,
        familyDate: input.familyDate,
        fullText,
        fullTextStatus: fullText ? "available" : "unavailable",
        passage: input.passage?.trim() || null,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "reference was not recorded");
    return {
      ...row,
      disclosureDate: disclosureDate(row),
      passageView: passageOf({
        fullText: row.fullText,
        fullTextStatus: row.fullTextStatus === "available" ? "available" : "unavailable",
      }),
    };
  });
}

export async function searchMatter(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; query: string },
  env: ResearchEnv,
) {
  assertHumanActor(ctx);
  const query = input.query.trim();
  if (query.length < 3)
    throw new AppError("VALIDATION_FAILED", "a query needs at least three characters");
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const imported = await tx
      .select()
      .from(schema.importedReferences)
      .where(eq(schema.importedReferences.matterId, input.matterId));
    const providers = adapterHealth(env);
    const matches = rankImports(query, imported).map((row) => ({
      id: row.id,
      title: row.title,
      score: row.score,
      disclosureDate: disclosureDate(row),
      familyDate: row.familyDate,
      passage: passageOf({
        fullText: row.fullText,
        fullTextStatus: row.fullTextStatus === "available" ? "available" : "unavailable",
      }),
    }));
    const plan = { egress: "none", providers };
    const [saved] = await tx
      .insert(schema.researchQueries)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        query,
        plan,
        stopReason,
      })
      .returning();
    if (!saved) throw new AppError("POLICY_BLOCKED", "query was not recorded");
    return { queryId: saved.id, query, matches, providers, stopReason, egress: "none" as const };
  });
}

export async function getResearch(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  env: ResearchEnv = {},
) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const references = await tx
      .select()
      .from(schema.importedReferences)
      .where(eq(schema.importedReferences.matterId, matterId));
    const queries = await tx
      .select()
      .from(schema.researchQueries)
      .where(eq(schema.researchQueries.matterId, matterId))
      .orderBy(desc(schema.researchQueries.createdAt));
    return {
      references: references.map((row) => ({
        ...row,
        disclosureDate: disclosureDate(row),
        passageView: passageOf({
          fullText: row.fullText,
          fullTextStatus: row.fullTextStatus === "available" ? "available" : "unavailable",
        }),
      })),
      queries,
      providers: adapterHealth(env),
    };
  });
}
