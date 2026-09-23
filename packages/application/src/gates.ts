import { createHash } from "node:crypto";
import { type Database, schema, withTenant } from "@patent/db";
import {
  assertHumanGateApproval,
  assertReleaseCapacity,
  canCarryForward,
  digestFor,
  displayedOutcome,
  evaluateGate,
  type GateFacts,
  gateIds,
  policyVersion,
  RuleError,
  releaseCovers,
} from "@patent/domain";
import { desc, eq } from "drizzle-orm";
import { canonicalJson } from "./canonical";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

function sha(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function matterDigests(tx: Tx, matterId: string) {
  const claims = await tx
    .select()
    .from(schema.claimDrafts)
    .where(eq(schema.claimDrafts.matterId, matterId));
  const sections = await tx
    .select()
    .from(schema.specificationSections)
    .where(eq(schema.specificationSections.matterId, matterId));
  const claimDigest = sha(
    claims.map((claim) => ({
      id: claim.id,
      revision: claim.revision,
      connective: claim.connective,
      limitations: claim.limitations,
    })),
  );
  const packageDigest = sha({
    claimDigest,
    sections: sections.map((section) => ({
      kind: section.kind,
      revision: section.revision,
      text: section.text,
    })),
  });
  return { claimDigest, packageDigest };
}

async function factsOf(
  tx: Tx,
  matterId: string,
  matter: { processingPolicy: unknown; runBudgetMicrousd: string | null; applicantMode: string },
): Promise<GateFacts> {
  const policy = matter.processingPolicy as { trainingUseAllowed?: boolean } | null;
  const artifacts = await tx
    .select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.matterId, matterId));
  const questions = await tx
    .select()
    .from(schema.inventionQuestions)
    .where(eq(schema.inventionQuestions.matterId, matterId));
  const elements = await tx
    .select()
    .from(schema.inventionElements)
    .where(eq(schema.inventionElements.matterId, matterId));
  const contributions = await tx
    .select()
    .from(schema.contributions)
    .where(eq(schema.contributions.matterId, matterId));
  const releases = await tx
    .select()
    .from(schema.releaseChoices)
    .where(eq(schema.releaseChoices.matterId, matterId));
  const rules = await tx
    .select()
    .from(schema.matterRules)
    .where(eq(schema.matterRules.matterId, matterId));
  const sources = await tx.select().from(schema.legalSources);
  const findings = await tx
    .select()
    .from(schema.priorArtFindings)
    .where(eq(schema.priorArtFindings.matterId, matterId));
  const eligibility = await tx
    .select()
    .from(schema.eligibilityReviews)
    .where(eq(schema.eligibilityReviews.matterId, matterId));
  const alternatives = await tx
    .select()
    .from(schema.alternatives)
    .where(eq(schema.alternatives.matterId, matterId));
  const claims = await tx
    .select()
    .from(schema.claimDrafts)
    .where(eq(schema.claimDrafts.matterId, matterId));
  const sections = await tx
    .select()
    .from(schema.specificationSections)
    .where(eq(schema.specificationSections.matterId, matterId));
  const superseded = rules.some(
    (rule) => sources.find((source) => source.sourceKey === rule.sourceKey)?.supersededBy,
  );
  const { packageDigest } = await matterDigests(tx, matterId);
  const manifests = await tx
    .select()
    .from(schema.exportManifests)
    .where(eq(schema.exportManifests.matterId, matterId));
  const liveExport = manifests.some(
    (row) => row.packageDigest === packageDigest && row.expiresAt.getTime() > Date.now(),
  );
  const commercial = await tx
    .select({ id: schema.commercialAssessments.id })
    .from(schema.commercialAssessments)
    .where(eq(schema.commercialAssessments.matterId, matterId));
  const receipts = await tx
    .select({ verified: schema.filingReceipts.verified })
    .from(schema.filingReceipts)
    .where(eq(schema.filingReceipts.matterId, matterId));
  const actions = await tx
    .select({ id: schema.officeActions.id })
    .from(schema.officeActions)
    .where(eq(schema.officeActions.matterId, matterId));
  return {
    trainingUseAllowed: policy ? policy.trainingUseAllowed === true : null,
    budgetSet: Boolean(matter.runBudgetMicrousd),
    uncleanArtifacts: artifacts.filter((artifact) => artifact.scanStatus !== "clean").length,
    artifactCount: artifacts.length,
    openQuestions: questions.filter((question) => question.status === "open").length,
    elementCount: elements.length,
    contributionCount: contributions.length,
    entitySelfFiler:
      matter.applicantMode === "entity_applicant" &&
      releases.some((row) => row.label === "self-filer"),
    supersededRule: Boolean(superseded),
    currentRule: rules.some(
      (rule) =>
        rule.status === "current" &&
        !sources.find((source) => source.sourceKey === rule.sourceKey)?.supersededBy,
    ),
    fabricatedCitations: findings.filter((finding) => finding.reason === "fabricated_citation")
      .length,
    snippetAnticipations: findings.filter((finding) => finding.reason === "snippet_only").length,
    unmotivatedCombinations: findings.filter(
      (finding) => finding.reason === "absent_combination_motivation",
    ).length,
    genericEligibility: eligibility.filter((row) => row.reason === "generic_eligibility_fix")
      .length,
    modelInDisclosure: alternatives.filter(
      (row) => row.origin === "model" && row.inSelectedDisclosure,
    ).length,
    staleSupport: claims.filter((claim) => claim.supportStatus === "stale").length,
    claimCount: claims.length,
    sectionKinds: sections.map((section) => section.kind),
    commercialRecorded: commercial.length > 0,
    exportDigest: liveExport ? packageDigest : null,
    receiptVerified: receipts.some((row) => row.verified),
    officeAction: actions.length > 0,
    watchPlan: false,
  };
}

export async function evaluateGates(db: Database, ctx: AuthorizedContext, matterId: string) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, matterId);
    await requireEditor(tx, matterId, ctx.userId);
    const facts = await factsOf(tx, matterId, matter);
    const { claimDigest, packageDigest } = await matterDigests(tx, matterId);
    const rows = [];
    for (const gateId of gateIds) {
      const decision = evaluateGate(gateId, facts);
      const [row] = await tx
        .insert(schema.gateEvaluations)
        .values({
          tenantId: ctx.tenantId,
          matterId,
          gateId,
          policyVersion,
          dependencyDigest: digestFor(gateId, claimDigest, packageDigest),
          snapshotRevision: matter.headRevision,
          outcome: decision.outcome,
          explanation: decision.explanation,
          evaluatorKind: "deterministic",
        })
        .returning();
      if (row) rows.push(row);
    }
    return rows;
  });
}

export async function approveGate(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; gateId: string },
) {
  try {
    assertHumanGateApproval(ctx.actorKind ?? "person");
  } catch (error) {
    blocked(error);
  }
  assertHumanActor(ctx);
  if (!gateIds.includes(input.gateId as (typeof gateIds)[number])) {
    throw new AppError("VALIDATION_FAILED", "unknown gate");
  }
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const facts = await factsOf(tx, input.matterId, matter);
    const decision = evaluateGate(input.gateId, facts);
    if (decision.outcome === "fail") {
      throw new AppError("GATE_BLOCKED", decision.explanation);
    }
    const { claimDigest, packageDigest } = await matterDigests(tx, input.matterId);
    const [row] = await tx
      .insert(schema.gateEvaluations)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        gateId: input.gateId,
        policyVersion,
        dependencyDigest: digestFor(input.gateId, claimDigest, packageDigest),
        snapshotRevision: matter.headRevision,
        outcome: "pass",
        explanation: "A person approved this gate for the current digest.",
        evaluatorKind: "human",
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "approval was not recorded");
    return row;
  });
}

export async function releasePackage(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; requestedCapacity: string; recordedCapacity: string },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    try {
      assertReleaseCapacity({
        applicantMode: matter.applicantMode,
        requested: input.requestedCapacity,
        recorded: input.recordedCapacity,
      });
    } catch (error) {
      blocked(error);
    }
    const facts = await factsOf(tx, input.matterId, matter);
    const blocking = gateIds
      .map((gateId) => evaluateGate(gateId, facts))
      .find((decision) => decision.outcome === "fail");
    if (blocking) throw new AppError("GATE_BLOCKED", blocking.explanation);
    const { claimDigest, packageDigest } = await matterDigests(tx, input.matterId);
    const [release] = await tx
      .insert(schema.gateReleases)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        manifestDigest: packageDigest,
        capacity: input.requestedCapacity,
      })
      .returning();
    const [evaluation] = await tx
      .insert(schema.gateEvaluations)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        gateId: "G13",
        policyVersion,
        dependencyDigest: packageDigest,
        snapshotRevision: matter.headRevision,
        outcome: "pass",
        explanation: "A person released this package digest.",
        evaluatorKind: "human",
      })
      .returning();
    if (!release || !evaluation) throw new AppError("POLICY_BLOCKED", "release was not recorded");
    return { release, claimDigest, packageDigest };
  });
}

export async function getGates(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const { claimDigest, packageDigest } = await matterDigests(tx, matterId);
    const evaluations = await tx
      .select()
      .from(schema.gateEvaluations)
      .where(eq(schema.gateEvaluations.matterId, matterId))
      .orderBy(desc(schema.gateEvaluations.createdAt));
    const releases = await tx
      .select()
      .from(schema.gateReleases)
      .where(eq(schema.gateReleases.matterId, matterId));
    const latest = gateIds.map((gateId) => {
      const stored = evaluations.find((row) => row.gateId === gateId);
      const currentDigest = digestFor(gateId, claimDigest, packageDigest);
      return {
        gateId,
        outcome: stored ? displayedOutcome(stored, currentDigest) : "pending",
        explanation: stored?.explanation ?? "Not evaluated.",
        dependencyDigest: currentDigest,
        carryForward: stored
          ? canCarryForward(gateId, stored.dependencyDigest, currentDigest)
          : false,
      };
    });
    const covering = releases.filter((release) =>
      releaseCovers(release.manifestDigest, packageDigest),
    );
    return { gates: latest, packageDigest, claimDigest, releaseCoversPackage: covering.length > 0 };
  });
}
