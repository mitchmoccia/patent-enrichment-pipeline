import { describe, expect, it } from "vitest";
import { entersSelectedDisclosure, experimentExecution, rankAlternative } from "../src/index.js";

describe("alternatives", () => {
  it("does not treat a benefit-removing design-around as equivalent without an explanation", () => {
    expect(
      rankAlternative({
        origin: "model",
        removesBenefit: "durable reservation",
        explanation: null,
        partitionTolerant: false,
        consistencyAssumption: null,
      }),
    ).toEqual({
      rank: "not_equivalent",
      reason: "removed an essential benefit without an explanation",
    });
  });

  it("requires a consistency assumption and keeps model text out of the disclosure", () => {
    expect(() =>
      rankAlternative({
        origin: "person",
        removesBenefit: null,
        explanation: null,
        partitionTolerant: true,
        consistencyAssumption: null,
      }),
    ).toThrowError(/consistency/);
    expect(entersSelectedDisclosure("model", true)).toBe(false);
    expect(entersSelectedDisclosure("person", true)).toBe(true);
    expect(experimentExecution(false).status).toBe("unavailable");
  });
});
