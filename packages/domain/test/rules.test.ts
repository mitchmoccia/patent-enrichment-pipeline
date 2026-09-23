import { describe, expect, it } from "vitest";
import {
  assertCurrentRule,
  assertFilingCoversEmbodiment,
  assertSelfFilerRelease,
  seededLegalSources,
} from "../src/index.js";

describe("legal rules and chronology", () => {
  it("refuses the 2024 inventorship guidance after the 2025 guidance supersedes it", () => {
    const older = seededLegalSources.find((source) => source.sourceKey.endsWith("2024"));
    const current = seededLegalSources.find((source) => source.sourceKey.endsWith("2025"));
    expect(older?.supersededBy).toBe(current?.sourceKey);
    expect(older?.counselApproved).toBe(false);
    expect(current?.counselApproved).toBe(false);
    expect(() => assertCurrentRule(older ?? { supersededBy: "x" })).toThrowError(/superseded/);
    expect(() => assertCurrentRule(current ?? { supersededBy: null })).not.toThrow();
  });

  it("refuses to give a new embodiment an older filing date", () => {
    expect(() => assertFilingCoversEmbodiment("2024-06-01", "2020-01-15")).toThrowError(
      /earlier filing date/,
    );
    expect(() => assertFilingCoversEmbodiment("2024-06-01", "2024-06-01")).not.toThrow();
  });

  it("refuses a self-filer release for an entity applicant", () => {
    expect(() => assertSelfFilerRelease("entity_applicant")).toThrowError(/self-filer/);
    expect(() => assertSelfFilerRelease("individual_self_filer")).not.toThrow();
  });
});
