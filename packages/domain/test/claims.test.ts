import { describe, expect, it } from "vitest";
import {
  assertClaimSet,
  type ClaimDraft,
  contradictoryQuantifiers,
  dependencyCycle,
  removedLimitations,
  supportCrossesIncompatible,
} from "../src/index.js";

const limitation = { id: "lim-1", text: "records a timeout", actor: "worker" };

function claim(overrides: Partial<ClaimDraft> = {}): ClaimDraft {
  return {
    id: "c1",
    category: "method",
    dependsOn: null,
    connective: "and",
    limitations: [limitation],
    ...overrides,
  };
}

describe("claim structure", () => {
  it("rejects a dependency cycle and a category change", () => {
    expect(
      dependencyCycle([
        { id: "a", dependsOn: "b" },
        { id: "b", dependsOn: "a" },
      ]),
    ).toBe(true);
    expect(() =>
      assertClaimSet([
        claim({ id: "parent", category: "method" }),
        claim({ id: "child", dependsOn: "parent", category: "system" }),
      ]),
    ).toThrowError(/category/);
  });

  it("treats an AND-to-OR edit and a deleted condition as support changes", () => {
    const before = [limitation, { id: "lim-2", text: "at least one reservation", actor: null }];
    expect(removedLimitations(before, [limitation])).toEqual(["lim-2"]);
    expect(contradictoryQuantifiers("at least one reservation and exactly zero reservations")).toBe(
      true,
    );
    expect(() =>
      assertClaimSet([
        claim({
          limitations: [{ id: "lim-2", text: "at least one and exactly zero", actor: null }],
        }),
      ]),
    ).toThrowError(/quantity/);
  });

  it("rejects support spread across incompatible embodiments", () => {
    expect(
      supportCrossesIncompatible(["emb-a", "emb-b"], [{ left: "emb-a", right: "emb-b" }]),
    ).toBe(true);
    expect(supportCrossesIncompatible(["emb-a"], [{ left: "emb-a", right: "emb-b" }])).toBe(false);
  });
});
