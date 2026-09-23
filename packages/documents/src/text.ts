export interface ExtractedSpan {
  locator: Record<string, unknown>;
  excerpt: string;
  quality: "verified" | "machine_extracted" | "uncertain";
}

export interface Inspection {
  text: string;
  quality: ExtractedSpan["quality"];
  spans: ExtractedSpan[];
  note?: string;
}

function span(
  text: string,
  quality: ExtractedSpan["quality"],
  locator: Record<string, unknown>,
): ExtractedSpan {
  return {
    locator,
    excerpt: text.slice(0, 2000),
    quality,
  };
}

/** Byte-faithful text. Negation and quantities are preserved. */
export function inspectPlainText(bytes: Uint8Array, path = "upload.txt"): Inspection {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return {
    text,
    quality: "machine_extracted",
    spans: [
      span(text, "machine_extracted", {
        kind: "text",
        path,
        startOffset: 0,
        endOffset: text.length,
      }),
    ],
  };
}

export function inspectJson(bytes: Uint8Array): Inspection {
  const raw = new TextDecoder().decode(bytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("MALFORMED_JSON");
  }
  const text = JSON.stringify(parsed, null, 2);
  return {
    text,
    quality: "machine_extracted",
    spans: [
      span(text, "machine_extracted", { kind: "text", startOffset: 0, endOffset: text.length }),
    ],
  };
}

export function inspectCsv(bytes: Uint8Array): Inspection {
  const text = new TextDecoder().decode(bytes);
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  return {
    text,
    quality: "machine_extracted",
    spans: lines.map((line, index) =>
      span(line, "machine_extracted", {
        kind: "text",
        line: index + 1,
        startOffset: 0,
        endOffset: line.length,
      }),
    ),
  };
}

export function inspectImage(): Inspection {
  return {
    text: "",
    quality: "uncertain",
    spans: [],
    note: "OCR is not configured. No text was invented from this image.",
  };
}
