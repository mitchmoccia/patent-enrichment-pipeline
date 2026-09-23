import { readZip } from "@patent/security";
import type { Inspection } from "./text";

/** Read DOCX XML text. Macro packages are rejected by the ZIP reader. */
export function inspectDocx(bytes: Uint8Array): Inspection {
  const entries = readZip(bytes);
  const xml = entries.find((entry) => entry.path === "word/document.xml");
  if (!xml) {
    return {
      text: "",
      quality: "uncertain",
      spans: [],
      note: "DOCX has no word/document.xml. No text was invented.",
    };
  }
  const text = paragraphs(new TextDecoder().decode(xml.bytes));
  return {
    text,
    quality: "machine_extracted",
    spans: [
      {
        locator: { kind: "docx", paragraphId: "p-1" },
        excerpt: text.slice(0, 2000),
        quality: "machine_extracted",
      },
    ],
  };
}

function paragraphs(xml: string): string {
  return xml
    .split(/<\/w:p>/)
    .map((block) =>
      [...block.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
        .map((match) => decodeXml(match[1] ?? ""))
        .join(""),
    )
    .filter((paragraph) => paragraph.length > 0)
    .join("\n");
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}
