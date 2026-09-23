import { RuleError } from "./rules";

export const policyVersion = "us-software-utility-2026-09-design-1";

const claimBound = new Set(["G05", "G06", "G07", "G08", "G09", "G10", "G12", "G13"]);

export const gateIds = [
  "G00",
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
  "G16",
] as const;

export type GateDecision = {
  outcome: "needs_information" | "needs_review" | "fail";
  explanation: string;
};

export interface GateFacts {
  trainingUseAllowed: boolean | null;
  budgetSet: boolean;
  uncleanArtifacts: number;
  artifactCount: number;
  openQuestions: number;
  elementCount: number;
  contributionCount: number;
  entitySelfFiler: boolean;
  supersededRule: boolean;
  currentRule: boolean;
  fabricatedCitations: number;
  snippetAnticipations: number;
  unmotivatedCombinations: number;
  genericEligibility: number;
  modelInDisclosure: number;
  staleSupport: number;
  claimCount: number;
  sectionKinds: readonly string[];
  commercialRecorded: boolean;
  exportDigest: string | null;
  receiptVerified: boolean;
  officeAction: boolean;
  watchPlan: boolean;
}

function fail(explanation: string): GateDecision {
  return { outcome: "fail", explanation };
}

function review(explanation: string): GateDecision {
  return { outcome: "needs_review", explanation };
}

function missing(explanation: string): GateDecision {
  return { outcome: "needs_information", explanation };
}

/** Deterministic checks never pass a gate. A person records a pass separately. */
export function evaluateGate(gateId: string, facts: GateFacts): GateDecision {
  switch (gateId) {
    case "G00":
      if (facts.trainingUseAllowed === true)
        return fail("training use is not an allowed processing route");
      if (facts.trainingUseAllowed === null || !facts.budgetSet) {
        return missing("processing policy or run budget is not recorded");
      }
      return review("policy and budget are recorded; a person still approves the scope");
    case "G01":
      if (facts.uncleanArtifacts > 0) return fail("an artifact is not a clean hash-checked object");
      if (facts.artifactCount === 0) return missing("no artifact has been stored");
      return review("stored artifacts are clean; extraction limits stay visible");
    case "G02":
      if (facts.openQuestions > 0) return missing("a mechanism question is still open");
      if (facts.elementCount === 0) return missing("no supplied mechanism statement is recorded");
      return review("supplied statements exist; they are not a completed invention");
    case "G03":
      if (facts.entitySelfFiler) return fail("an entity applicant cannot use a self-filer release");
      if (facts.contributionCount === 0)
        return missing("inventor, applicant, owner, and assignment are not recorded");
      return review("roles are recorded and legal inventorship stays unresolved");
    case "G04":
      if (facts.supersededRule) return fail("superseded guidance cannot govern the active rule");
      if (!facts.currentRule) return missing("no current legal source is selected");
      return review("the current source is not counsel-approved, and office search was not called");
    case "G05":
      if (facts.fabricatedCitations > 0) return fail("a relied-on quote is not in the source");
      if (facts.snippetAnticipations > 0) return fail("anticipation cannot rest on a snippet");
      if (facts.unmotivatedCombinations > 0) return fail("a combination has no motivation");
      if (facts.claimCount === 0) return missing("there is no claim to chart");
      return review("prior-art rows are separate from legal disposition");
    case "G06":
      if (facts.genericEligibility > 0)
        return fail("a generic processor or AI sentence is not an eligibility pass");
      return review("eligibility stays claim-specific; there is no success probability");
    case "G07":
      if (facts.modelInDisclosure > 0)
        return fail("a model proposal is in the selected disclosure");
      return review("alternatives stay separate from legal conclusions");
    case "G08":
      if (facts.staleSupport > 0) return fail("claim support is stale for the current text");
      if (facts.claimCount === 0) return missing("no claim draft is recorded");
      return review("claim structure is stored; support still needs a person");
    case "G09": {
      const required = ["abstract", "description", "claims"];
      if (required.some((kind) => !facts.sectionKinds.includes(kind))) {
        return missing("abstract, description, or claims is missing");
      }
      return review("sections exist; a description edit invalidates support");
    }
    case "G10":
      if (facts.fabricatedCitations > 0) {
        return fail("models agreeing on a missing citation do not verify it");
      }
      return review("independent challenge has no integrity block from citations");
    case "G11":
      if (!facts.commercialRecorded) return missing("commercial assessment is not recorded");
      return review("a commercial record exists and does not prove demand");
    case "G12":
      if (!facts.exportDigest) return missing("no export manifest is recorded");
      return review("an export digest exists; portal rendering is still the filer's inspection");
    case "G13":
      return review("human release binds one package digest and is not carried forward");
    case "G14":
      if (!facts.receiptVerified) return missing("no receipt means filing is not verified");
      return review("a receipt is recorded and still needs reconciliation");
    case "G15":
      if (!facts.officeAction) return missing("no office action is recorded");
      return review("prosecution readiness is not a filed amendment");
    case "G16":
      if (!facts.watchPlan) return missing("no approved watch plan is recorded");
      return review("a watch plan does not authorize a demand letter");
    default:
      return missing("unknown gate");
  }
}

export function digestFor(gateId: string, claimDigest: string, packageDigest: string): string {
  if (gateId === "G12" || gateId === "G13") return packageDigest;
  if (claimBound.has(gateId)) return claimDigest;
  return "matter-scope";
}

export function displayedOutcome(
  stored: { outcome: string; dependencyDigest: string },
  currentDigest: string,
): string {
  if (stored.dependencyDigest !== currentDigest) return "stale";
  return stored.outcome;
}

/** Human release is never copied onto a successor package. */
export function canCarryForward(
  gateId: string,
  storedDigest: string,
  currentDigest: string,
): boolean {
  if (gateId === "G13") return false;
  return storedDigest === currentDigest;
}

export function citationConsensus(
  quote: string,
  source: string | null,
  _modelAgreements: number,
): {
  verified: boolean;
  reason: string;
} {
  const needle = quote.trim();
  const verified = needle.length > 0 && Boolean(source?.includes(needle));
  return verified
    ? { verified: true, reason: "the quote is in the source" }
    : { verified: false, reason: "fabricated_citation" };
}

export function assertHumanGateApproval(actorKind: "person" | "model"): void {
  if (actorKind === "model") throw new RuleError("a model cannot approve a gate");
}

export function assertReleaseCapacity(input: {
  applicantMode: string;
  requested: string;
  recorded: string;
}): void {
  if (
    input.recorded === "administrator" &&
    (input.requested === "patent_agent" || input.requested === "patent_attorney")
  ) {
    throw new RuleError("an administrator cannot release as a practitioner");
  }
  if (input.requested === "patent_agent" || input.requested === "patent_attorney") {
    throw new RuleError("practitioner capacity is not verified");
  }
  if (input.requested === "administrator") {
    throw new RuleError("an administrator cannot approve a release");
  }
  if (input.applicantMode === "entity_applicant") {
    throw new RuleError("an entity applicant needs a verified practitioner");
  }
}

export function releaseCovers(storedDigest: string, currentDigest: string): boolean {
  return storedDigest === currentDigest;
}
