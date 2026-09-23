import { QuarantineRejection } from "@patent/security";
import type { Inspection } from "./text";

const ACTIVE = ["/JavaScript", "/JS", "/Launch", "/OpenAction", "/AA "];

/** Conservative PDF text pull. Active content is rejected. Missing text stays missing. */
export function inspectPdf(bytes: Uint8Array): Inspection {
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 8)));
  if (!header.startsWith("%PDF-") || bytes.length < 16) {
    throw new QuarantineRejection("MALFORMED_PDF", "file is not a readable PDF");
  }
  const latin = new TextDecoder("latin1").decode(bytes);
  if (ACTIVE.some((token) => latin.includes(token))) {
    throw new QuarantineRejection("ACTIVE_PDF", "PDF contains active content and was not executed");
  }
  const parts: string[] = [];
  const pattern = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  for (const match of latin.matchAll(pattern)) {
    parts.push(unescapePdf(match[1] ?? ""));
  }
  const text = parts.join("\n");
  return {
    text,
    quality: text.length > 0 ? "machine_extracted" : "uncertain",
    note: text.length > 0 ? undefined : "No text operators were found. Nothing was inferred.",
    spans:
      text.length === 0
        ? []
        : [
            {
              locator: { kind: "pdf", page: 1 },
              excerpt: text.slice(0, 2000),
              quality: "machine_extracted",
            },
          ],
  };
}

function unescapePdf(value: string): string {
  return value.replace(/\\([()\\nrt])/g, (_, ch: string) => {
    if (ch === "n") return "\n";
    if (ch === "r") return "\r";
    if (ch === "t") return "\t";
    return ch;
  });
}
