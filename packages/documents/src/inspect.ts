import { QuarantineRejection, readZip } from "@patent/security";
import { inspectDocx } from "./docx";
import { inspectPdf } from "./pdf";
import { type Inspection, inspectCsv, inspectImage, inspectJson, inspectPlainText } from "./text";

const TEXT_EXT = new Set(["txt", "md", "ts", "tsx", "js", "py", "json", "csv"]);

/** Dispatch a quarantined upload. Unsupported types stay unavailable rather than guessed. */
export function inspectUpload(filename: string, mediaType: string, bytes: Uint8Array): Inspection {
  const lower = filename.toLowerCase();
  const type = mediaType.toLowerCase();
  if (type.startsWith("image/")) return inspectImage();
  if (type === "application/pdf" || lower.endsWith(".pdf")) return inspectPdf(bytes);
  if (type.includes("wordprocessingml") || lower.endsWith(".docx")) return inspectDocx(bytes);
  if (type === "application/json" || lower.endsWith(".json")) {
    try {
      return inspectJson(bytes);
    } catch (error) {
      if (error instanceof Error && error.message === "MALFORMED_JSON") {
        throw new QuarantineRejection(
          "MALFORMED_JSON",
          "JSON did not parse. No document was inferred.",
        );
      }
      throw error;
    }
  }
  if (type === "text/csv" || lower.endsWith(".csv")) return inspectCsv(bytes);
  if (type === "application/zip" || lower.endsWith(".zip")) return inspectSourceZip(bytes);
  if (type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return inspectPlainText(bytes, filename);
  }
  throw new QuarantineRejection(
    "UNSUPPORTED_FORMAT",
    `${mediaType || "unknown type"} is not an enabled parser. No text was invented.`,
  );
}

function inspectSourceZip(bytes: Uint8Array): Inspection {
  const entries = readZip(bytes);
  const texts: string[] = [];
  const spans: Inspection["spans"] = [];
  for (const entry of entries) {
    const ext = entry.path.split(".").pop()?.toLowerCase() ?? "";
    if (!TEXT_EXT.has(ext)) {
      spans.push({
        locator: {
          kind: "code",
          path: entry.path,
          commitOrDigest: "archive",
          firstLine: 0,
          lastLine: 0,
        },
        excerpt: "",
        quality: "uncertain",
      });
      continue;
    }
    const text = new TextDecoder().decode(entry.bytes);
    texts.push(`# ${entry.path}\n${text}`);
    const lines = text.split("\n");
    spans.push({
      locator: {
        kind: "code",
        path: entry.path,
        commitOrDigest: "archive",
        firstLine: 1,
        lastLine: lines.length,
      },
      excerpt: text.slice(0, 2000),
      quality: "machine_extracted",
    });
  }
  return {
    text: texts.join("\n\n"),
    quality: "machine_extracted",
    spans,
    note: "Source archive entries were read as text. No uploaded code was executed.",
  };
}
