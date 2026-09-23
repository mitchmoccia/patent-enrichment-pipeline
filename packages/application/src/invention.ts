import { createHash } from "node:crypto";
import { type IntakeSource, liveIntake, runIntake } from "@patent/ai";
import { type Database, schema, withTenant } from "@patent/db";
import { and, desc, eq } from "drizzle-orm";
import { canonicalJson } from "./canonical";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

export interface InventionEnv {
  AI_GATEWAY_API_KEY?: string;
  AI_INTAKE_MODEL?: string;
}

async function successor(
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
  await tx
    .update(schema.inventionAnalyses)
    .set({ status: "stale" })
    .where(
      and(
        eq(schema.inventionAnalyses.matterId, matterId),
        eq(schema.inventionAnalyses.status, "current"),
      ),
    );
}

function sourcesFrom(
  idea: string,
  artifacts: { id: string; extractedText: string | null; scanStatus: string }[],
): IntakeSource[] {
  const sources: IntakeSource[] = [{ id: "idea", role: "idea", text: idea }];
  for (const artifact of artifacts) {
    if (artifact.scanStatus !== "clean" || !artifact.extractedText) continue;
    const role = artifact.extractedText.trim().endsWith("?") ? "question" : "supplied";
    sources.push({ id: artifact.id, role, text: artifact.extractedText });
  }
  return sources;
}

export async function extractInvention(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  env: InventionEnv,
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, matterId);
    await requireEditor(tx, matterId, ctx.userId);
    const [ideaRow] = await tx
      .select({ text: schema.assertions.text })
      .from(schema.assertions)
      .where(
        and(
          eq(schema.assertions.matterId, matterId),
          eq(schema.assertions.classification, "supplied_fact"),
        ),
      );
    const artifacts = await tx
      .select({
        id: schema.artifacts.id,
        extractedText: schema.artifacts.extractedText,
        scanStatus: schema.artifacts.scanStatus,
      })
      .from(schema.artifacts)
      .where(eq(schema.artifacts.matterId, matterId));
    const modelId = env.AI_INTAKE_MODEL;
    const configured = Boolean(env.AI_GATEWAY_API_KEY && modelId);
    const plan = await runIntake(sourcesFrom(ideaRow?.text ?? matter.goal ?? "", artifacts), {
      apiKey: configured ? env.AI_GATEWAY_API_KEY : undefined,
      live:
        configured && modelId
          ? (prompt, sources) => liveIntake(modelId, prompt, sources)
          : undefined,
    });
    const detail =
      plan.status === "provider_unavailable"
        ? "No model route produced an extraction. Questions are gaps in the supplied record."
        : "Live intake kept exact quotes and stored other model text as a proposal.";
    const [extraction] = await tx
      .insert(schema.inventionExtractions)
      .values({
        tenantId: ctx.tenantId,
        matterId,
        snapshotRevision: matter.headRevision,
        route: plan.route,
        status: plan.status,
        detail,
      })
      .returning();
    if (!extraction) throw new AppError("POLICY_BLOCKED", "extraction was not recorded");
    if (plan.elements.length > 0) {
      await tx.insert(schema.inventionElements).values(
        plan.elements.map((element) => ({
          tenantId: ctx.tenantId,
          matterId,
          extractionId: extraction.id,
          kind: element.kind,
          text: element.text,
          classification: element.classification,
          proposedByKind: element.proposedByKind,
          sourceId: element.sourceId,
        })),
      );
    }
    for (const question of plan.questions) {
      const [existing] = await tx
        .select({ id: schema.inventionQuestions.id })
        .from(schema.inventionQuestions)
        .where(
          and(
            eq(schema.inventionQuestions.matterId, matterId),
            eq(schema.inventionQuestions.text, question.text),
          ),
        );
      if (existing) continue;
      await tx.insert(schema.inventionQuestions).values({
        tenantId: ctx.tenantId,
        matterId,
        text: question.text,
        whyItMatters: question.whyItMatters,
        affectedFeature: question.affectedFeature,
        sourceId: question.sourceId,
        origin: question.origin,
      });
    }
    for (const task of plan.tasks) {
      const [existing] = await tx
        .select({ id: schema.developmentTasks.id })
        .from(schema.developmentTasks)
        .where(
          and(
            eq(schema.developmentTasks.matterId, matterId),
            eq(schema.developmentTasks.text, task.text),
          ),
        );
      if (existing) continue;
      await tx.insert(schema.developmentTasks).values({
        tenantId: ctx.tenantId,
        matterId,
        text: task.text,
        reason: task.reason,
      });
    }
    for (const proposal of plan.proposals) {
      const [existing] = await tx
        .select({ id: schema.mechanismSuggestions.id })
        .from(schema.mechanismSuggestions)
        .where(
          and(
            eq(schema.mechanismSuggestions.matterId, matterId),
            eq(schema.mechanismSuggestions.text, proposal.text),
          ),
        );
      if (existing) continue;
      await tx.insert(schema.mechanismSuggestions).values({
        tenantId: ctx.tenantId,
        matterId,
        text: proposal.text,
        classification: "proposed_embodiment",
        proposedByKind: "model",
        inventorship: "unresolved",
        inventionDate: null,
      });
    }
    await tx.insert(schema.inventionAnalyses).values({
      tenantId: ctx.tenantId,
      matterId,
      snapshotRevision: matter.headRevision,
      status: "current",
      subject: "mechanism",
    });
    return { status: plan.status, route: plan.route };
  });
}

export async function answerInventionQuestion(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; questionId: string; text: string; expectedRevision: number },
) {
  assertHumanActor(ctx);
  const text = input.text.trim();
  if (text.length === 0) throw new AppError("VALIDATION_FAILED", "an answer is required");
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    if (matter.headRevision !== input.expectedRevision) {
      throw new AppError("REVISION_CONFLICT", "the matter changed; reload and try again");
    }
    const [question] = await tx
      .select()
      .from(schema.inventionQuestions)
      .where(eq(schema.inventionQuestions.id, input.questionId));
    if (!question || question.matterId !== input.matterId)
      throw new AppError("NOT_FOUND", "question not found");
    const revision = matter.headRevision + 1;
    const answeredAt = new Date();
    await tx.insert(schema.inventionAnswers).values({
      tenantId: ctx.tenantId,
      matterId: input.matterId,
      questionId: question.id,
      text,
      answeredAt,
      answeredBy: ctx.userId,
      snapshotRevision: revision,
    });
    await tx
      .update(schema.inventionQuestions)
      .set({ status: "answered" })
      .where(eq(schema.inventionQuestions.id, question.id));
    await tx.insert(schema.assertions).values({
      tenantId: ctx.tenantId,
      matterId: input.matterId,
      text,
      classification: "supplied_fact",
      proposedByKind: "person",
      proposedById: ctx.userId,
      status: "confirmed",
    });
    await tx
      .update(schema.matters)
      .set({ headRevision: revision })
      .where(eq(schema.matters.id, matter.id));
    await successor(tx, ctx.tenantId, matter.id, revision, {
      kind: "answer",
      questionId: question.id,
      text,
    });
    return { revision, answeredAt: answeredAt.toISOString() };
  });
}

export async function acceptMechanismSuggestion(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; suggestionId: string; expectedRevision: number },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    if (matter.headRevision !== input.expectedRevision) {
      throw new AppError("REVISION_CONFLICT", "the matter changed; reload and try again");
    }
    const [suggestion] = await tx
      .select()
      .from(schema.mechanismSuggestions)
      .where(eq(schema.mechanismSuggestions.id, input.suggestionId));
    if (!suggestion || suggestion.matterId !== input.matterId) {
      throw new AppError("NOT_FOUND", "suggestion not found");
    }
    const acceptedAt = new Date();
    const revision = matter.headRevision + 1;
    await tx
      .update(schema.mechanismSuggestions)
      .set({ status: "accepted", acceptedAt, inventionDate: null, inventorship: "unresolved" })
      .where(eq(schema.mechanismSuggestions.id, suggestion.id));
    await tx.insert(schema.assertions).values({
      tenantId: ctx.tenantId,
      matterId: input.matterId,
      text: suggestion.text,
      classification: "proposed_embodiment",
      proposedByKind: "model",
      proposedById: "model",
      status: "confirmed",
    });
    await tx
      .update(schema.matters)
      .set({ headRevision: revision })
      .where(eq(schema.matters.id, matter.id));
    await successor(tx, ctx.tenantId, matter.id, revision, {
      kind: "accept_suggestion",
      suggestionId: suggestion.id,
      acceptedAt: acceptedAt.toISOString(),
    });
    return { revision, acceptedAt: acceptedAt.toISOString() };
  });
}

export async function getInvention(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const extractions = await tx
      .select()
      .from(schema.inventionExtractions)
      .where(eq(schema.inventionExtractions.matterId, matterId))
      .orderBy(desc(schema.inventionExtractions.createdAt));
    const elements = await tx
      .select()
      .from(schema.inventionElements)
      .where(eq(schema.inventionElements.matterId, matterId));
    const questions = await tx
      .select()
      .from(schema.inventionQuestions)
      .where(eq(schema.inventionQuestions.matterId, matterId));
    const answers = await tx
      .select()
      .from(schema.inventionAnswers)
      .where(eq(schema.inventionAnswers.matterId, matterId));
    const tasks = await tx
      .select()
      .from(schema.developmentTasks)
      .where(eq(schema.developmentTasks.matterId, matterId));
    const suggestions = await tx
      .select()
      .from(schema.mechanismSuggestions)
      .where(eq(schema.mechanismSuggestions.matterId, matterId));
    const analyses = await tx
      .select()
      .from(schema.inventionAnalyses)
      .where(eq(schema.inventionAnalyses.matterId, matterId));
    return {
      revision: matter.headRevision,
      extractions,
      elements,
      questions,
      answers,
      tasks,
      suggestions,
      analyses,
    };
  });
}
