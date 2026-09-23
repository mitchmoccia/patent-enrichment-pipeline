import { createHash } from "node:crypto";

export interface ExportSection {
  kind: string;
  text: string;
}

export interface ExportFigure {
  numeral: string;
  label: string;
}

export interface ExportClaim {
  number: number;
  text: string;
}

export interface ExportSupport {
  limitation: string;
  status: string;
}

export interface ExportRequest {
  sections: readonly ExportSection[];
  figures: readonly ExportFigure[];
  claims: readonly ExportClaim[];
  support: readonly ExportSupport[];
}

export type ExportFailure =
  | "missing_clause"
  | "hidden_comment"
  | "orphan_figure"
  | "bad_claim_numbering"
  | "metadata_leakage"
  | "page_overflow"
  | "altered_unicode";

const pageBudget = 4000;

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function textsMatch(source: string, rendered: string): boolean {
  return source.normalize("NFC") === rendered.normalize("NFC");
}

export function assembleExport(input: ExportRequest):
  | { ok: false; reason: ExportFailure }
  | {
      ok: true;
      files: { name: string; text: string; sha256: string }[];
      digest: string;
      pdfStatus: "text_only" | "review_rendering_unavailable";
      unexecuted: true;
      portalRendering: "filer_must_inspect";
    } {
  const claims = input.sections.find((section) => section.kind === "claims");
  if (!claims?.text.trim()) return { ok: false, reason: "missing_clause" };
  const joined = input.sections.map((section) => section.text).join("\n");
  if (/<!--|\[INTERNAL\]|review only:/i.test(joined))
    return { ok: false, reason: "hidden_comment" };
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|tenant_|bearer /i.test(joined)) {
    return { ok: false, reason: "metadata_leakage" };
  }
  for (const match of joined.matchAll(/figure\s+(\d+)/gi)) {
    const numeral = match[1] ?? "";
    if (!input.figures.some((figure) => figure.numeral === numeral)) {
      return { ok: false, reason: "orphan_figure" };
    }
  }
  const numbers = [...input.claims].sort((left, right) => left.number - right.number);
  if (numbers.some((claim, index) => claim.number !== index + 1)) {
    return { ok: false, reason: "bad_claim_numbering" };
  }
  const raw = input.sections.map((section) => section.text).join("\n\n");
  if (raw !== raw.normalize("NFC")) return { ok: false, reason: "altered_unicode" };
  const clean = input.sections
    .map((section) => `${section.kind}\n${section.text.normalize("NFC")}`)
    .join("\n\n");
  if (clean.length > pageBudget) return { ok: false, reason: "page_overflow" };
  const review = [
    "Review copy. Not a filing and not a grant.",
    "This is not a USPTO portal rendering. The filer must inspect the official view.",
    "The form in this package is unexecuted.",
  ].join("\n");
  const form = "UNEXECUTED\nThis form is not signed and has not been filed.";
  const csv = [
    "limitation,status",
    ...input.support.map((row) => `${row.limitation},${row.status}`),
  ].join("\n");
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?><document>${clean
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")}</document>`;
  const files = [
    { name: "clean.txt", text: clean },
    { name: "review.txt", text: review },
    { name: "word/document.xml", text: documentXml },
    { name: "support.csv", text: csv },
    { name: "form.txt", text: form },
  ].map((file) => ({ ...file, sha256: sha(file.text) }));
  const digest = sha(files.map((file) => `${file.name}:${file.sha256}`).join("\n"));
  return {
    ok: true,
    files,
    digest,
    pdfStatus: "review_rendering_unavailable",
    unexecuted: true,
    portalRendering: "filer_must_inspect",
  };
}
