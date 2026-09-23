import { describe, expect, it } from "vitest";
import { nextStage, readResumePayload } from "../src/index.js";

describe("workflow resume", () => {
  it("rejects an approved flag that has no decision id", () => {
    expect(() => readResumePayload({ approved: true })).toThrowError(/decision id/);
    expect(readResumePayload({ decisionId: "decision-1" }).decisionId).toBe("decision-1");
  });

  it("walks ingest then analyze and then stops", () => {
    expect(nextStage(null)).toBe("ingest");
    expect(nextStage("ingest")).toBe("analyze");
    expect(nextStage("analyze")).toBeNull();
  });
});
