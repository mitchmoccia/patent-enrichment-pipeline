import { describe, expect, it } from "vitest";
import {
  assertReleaseCapacity,
  canCarryForward,
  citationConsensus,
  displayedOutcome,
  evaluateGate,
  type GateFacts,
  releaseCovers,
} from "../src/index.js";

const empty: GateFacts = {
  trainingUseAllowed: false,
  budgetSet: true,
  uncleanArtifacts: 0,
  artifactCount: 1,
  openQuestions: 0,
  elementCount: 1,
  contributionCount: 1,
  entitySelfFiler: false,
  supersededRule: false,
  currentRule: true,
  fabricatedCitations: 0,
  snippetAnticipations: 0,
  unmotivatedCombinations: 0,
  genericEligibility: 0,
  modelInDisclosure: 0,
  staleSupport: 0,
  claimCount: 1,
  sectionKinds: ["abstract", "description", "claims"],
  commercialRecorded: false,
  exportDigest: null,
  receiptVerified: false,
  officeAction: false,
  watchPlan: false,
};

describe("gate service rules", () => {
  it("blocks a fabricated citation even when three models agree", () => {
    expect(citationConsensus("missing quote", "the real source", 3)).toEqual({
      verified: false,
      reason: "fabricated_citation",
    });
    expect(evaluateGate("G10", { ...empty, fabricatedCitations: 1 }).outcome).toBe("fail");
  });

  it("shows a changed claim as stale and refuses to carry a human release forward", () => {
    expect(displayedOutcome({ outcome: "pass", dependencyDigest: "a" }, "b")).toBe("stale");
    expect(canCarryForward("G08", "same", "same")).toBe(true);
    expect(canCarryForward("G13", "same", "same")).toBe(false);
    expect(releaseCovers("package-a", "package-b")).toBe(false);
  });

  it("stops an administrator from taking practitioner capacity", () => {
    expect(() =>
      assertReleaseCapacity({
        applicantMode: "individual_self_filer",
        requested: "patent_attorney",
        recorded: "administrator",
      }),
    ).toThrowError(/administrator/);
  });
});
