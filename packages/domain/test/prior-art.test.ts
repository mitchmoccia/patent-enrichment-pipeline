import { describe, expect, it } from "vitest";
import { assessEligibility, assessFinding } from "../src/index.js";

const passage = "The worker records a timeout before releasing the reservation.";

describe("prior-art findings", () => {
  it("rejects a fabricated citation and a success probability", () => {
    expect(
      assessFinding({
        kind: "technical_similarity",
        quotes: [
          {
            quote: "Root authority ledger",
            sourceText: passage,
            fullTextStatus: "unavailable",
            disclosureDate: "2009-01-01",
          },
        ],
        criticalDate: "2010-01-01",
        motivation: null,
      }),
    ).toMatchObject({ legalStatus: "rejected", reason: "fabricated_citation" });
    expect(() =>
      assessFinding({
        kind: "technical_similarity",
        quotes: [
          {
            quote: passage,
            sourceText: passage,
            fullTextStatus: "available",
            disclosureDate: "2009-01-01",
          },
        ],
        criticalDate: "2010-01-01",
        motivation: null,
        successProbability: 0.8,
      }),
    ).toThrowError(/probability/);
  });

  it("rejects snippet-only anticipation, a later date, and an unmotivated combination", () => {
    const quote = {
      quote: passage,
      sourceText: passage,
      fullTextStatus: "unavailable" as const,
      disclosureDate: "2009-01-01",
    };
    expect(
      assessFinding({
        kind: "anticipation",
        quotes: [quote],
        criticalDate: "2010-01-01",
        motivation: null,
      }).reason,
    ).toBe("snippet_only");
    expect(
      assessFinding({
        kind: "anticipation",
        quotes: [{ ...quote, fullTextStatus: "available", disclosureDate: "2022-01-01" }],
        criticalDate: "2010-01-01",
        motivation: null,
      }).reason,
    ).toBe("wrong_date");
    expect(
      assessFinding({
        kind: "obviousness",
        quotes: [quote, { ...quote, quote: "timeout", sourceText: passage }],
        criticalDate: "2010-01-01",
        motivation: null,
      }).reason,
    ).toBe("absent_combination_motivation");
    expect(
      assessFinding({
        kind: "anticipation",
        quotes: [
          { ...quote, fullTextStatus: "available" },
          { ...quote, quote: "timeout", sourceText: passage, fullTextStatus: "available" },
        ],
        criticalDate: "2010-01-01",
        motivation: "a textbook combines them",
      }).reason,
    ).toBe("distributed_features");
  });

  it("rejects a generic processor or AI eligibility sentence", () => {
    expect(assessEligibility("use a processor", ["records a timeout"]).reason).toBe(
      "generic_eligibility_fix",
    );
    expect(assessEligibility("use AI", ["records a timeout"]).reason).toBe(
      "generic_eligibility_fix",
    );
    expect(
      assessEligibility("The worker records a timeout.", ["records a timeout"]).legalStatus,
    ).toBe("supported");
  });
});
