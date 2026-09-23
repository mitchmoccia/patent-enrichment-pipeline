import { describe, expect, it } from "vitest";
import {
  assertAmendmentSupported,
  assertCanRecordFiled,
  extractOfficeClaims,
  reconcileFiles,
} from "../src/index.js";

describe("prosecution records", () => {
  it("treats a mismatched file as a reconciliation issue", () => {
    expect(reconcileFiles("aaa", "aaa")).toBe("matched");
    expect(reconcileFiles("aaa", "bbb")).toBe("reconciliation_issue");
  });

  it("refuses filing from a download, a checkbox, a model, or a missing receipt", () => {
    const base = {
      actorKind: "person",
      receiptVerified: true,
      requested: "filed",
      viaDownload: false,
      viaCheckbox: false,
    };
    expect(assertCanRecordFiled(base)).toBe("filed");
    expect(() => assertCanRecordFiled({ ...base, viaDownload: true })).toThrowError(/download/);
    expect(() => assertCanRecordFiled({ ...base, viaCheckbox: true })).toThrowError(/checkbox/);
    expect(() => assertCanRecordFiled({ ...base, actorKind: "model" })).toThrowError(/model/);
    expect(() => assertCanRecordFiled({ ...base, receiptVerified: false })).toThrowError(/receipt/);
    expect(() => assertCanRecordFiled({ ...base, requested: "granted_recorded" })).toThrowError(
      /grant/,
    );
  });

  it("blocks an amendment that adds a feature the original application did not disclose", () => {
    expect(() => assertAmendmentSupported({ supportNote: null, newlyInvented: true })).toThrowError(
      /unsupported amendment/,
    );
    expect(extractOfficeClaims("Claim 1 is rejected. Claim 1 is discussed.")).toEqual([1]);
  });
});
