import { describe, expect, it } from "vitest";
import { inspectFile } from "../src/inspect-file.js";

describe("document worker", () => {
  it("preserves negation and does not mark the file as executed", () => {
    const bytes = new TextEncoder().encode("The system does not duplicate authority.");
    const result = inspectFile("note.txt", "text/plain", bytes);
    expect(result.scanStatus).toBe("clean");
    expect(result.text).toContain("does not");
    expect(result.executed).toBe(false);
  });

  it("rejects a malformed PDF instead of inventing text", () => {
    const result = inspectFile("bad.pdf", "application/pdf", new TextEncoder().encode("hello"));
    expect(result.scanStatus).toBe("rejected");
    expect(result.text).toBe("");
    expect(result.note).toMatch(/MALFORMED_PDF/);
  });
});
