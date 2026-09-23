import { describe, expect, it } from "vitest";
import { assembleExport, textsMatch } from "../src/export.js";

const base = {
  sections: [
    { kind: "abstract", text: "A worker records a timeout." },
    { kind: "description", text: "Figure 1 shows a ledger." },
    { kind: "claims", text: "1. A method that records a timeout." },
  ],
  figures: [{ numeral: "1", label: "ledger" }],
  claims: [{ number: 1, text: "A method that records a timeout." }],
  support: [{ limitation: "records a timeout", status: "current" }],
};

describe("export package", () => {
  it("builds an unexecuted package and rejects the listed defects", () => {
    const built = assembleExport(base);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.unexecuted).toBe(true);
      expect(built.files.find((file) => file.name === "form.txt")?.text).toMatch(/UNEXECUTED/);
      expect(built.portalRendering).toBe("filer_must_inspect");
      expect(built.pdfStatus).toBe("review_rendering_unavailable");
    }
    expect(
      assembleExport({
        ...base,
        sections: base.sections.filter((section) => section.kind !== "claims"),
      }).ok,
    ).toBe(false);
    expect(
      assembleExport({
        ...base,
        sections: base.sections.map((section) =>
          section.kind === "description"
            ? { ...section, text: "Figure 9 shows a ledger. <!-- note -->" }
            : section,
        ),
      }),
    ).toMatchObject({ ok: false, reason: "hidden_comment" });
    expect(
      assembleExport({
        ...base,
        sections: base.sections.map((section) =>
          section.kind === "description"
            ? { ...section, text: "Figure 4 shows a ledger." }
            : section,
        ),
      }),
    ).toMatchObject({ ok: false, reason: "orphan_figure" });
    expect(assembleExport({ ...base, claims: [{ number: 2, text: "skipped" }] })).toMatchObject({
      ok: false,
      reason: "bad_claim_numbering",
    });
    expect(
      assembleExport({
        ...base,
        sections: base.sections.map((section) =>
          section.kind === "abstract" ? { ...section, text: "mail me at a@b.co" } : section,
        ),
      }),
    ).toMatchObject({ ok: false, reason: "metadata_leakage" });
    expect(textsMatch("≤", "<=")).toBe(false);
    expect(
      assembleExport({
        ...base,
        sections: base.sections.map((section) =>
          section.kind === "abstract" ? { ...section, text: "e\u0301" } : section,
        ),
      }),
    ).toMatchObject({ ok: false, reason: "altered_unicode" });
    expect(
      assembleExport({
        ...base,
        sections: base.sections.map((section) =>
          section.kind === "description" ? { ...section, text: "x".repeat(4001) } : section,
        ),
      }),
    ).toMatchObject({ ok: false, reason: "page_overflow" });
  });
});
