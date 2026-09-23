import { describe, expect, it } from "vitest";
import { storedZip } from "../../security/test/zip-fixture.ts";
import { inspectUpload } from "../src/index.js";
import { s3ObjectStore, unconfiguredStore } from "../src/object-store.js";

const text = (value: string) => new TextEncoder().encode(value);

describe("extraction", () => {
  it("keeps a negation in plain text", () => {
    const result = inspectUpload(
      "note.txt",
      "text/plain",
      text("The system does not duplicate authority."),
    );
    expect(result.text).toContain("does not");
  });

  it("keeps a negation in a DOCX paragraph", () => {
    const xml = text(
      `<?xml version="1.0"?><w:document><w:p><w:t>The worker does not spend twice.</w:t></w:p></w:document>`,
    );
    const docx = storedZip([{ name: "word/document.xml", data: xml }]);
    const result = inspectUpload(
      "spec.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docx,
    );
    expect(result.text).toContain("does not");
  });

  it("rejects a malformed PDF", () => {
    expect(() => inspectUpload("bad.pdf", "application/pdf", text("not a pdf"))).toThrowError(
      /not a readable PDF/,
    );
  });

  it("extracts a simple PDF string without dropping negation", () => {
    const pdf = text("%PDF-1.4\nBT (The system does not duplicate authority.) Tj ET\n%%EOF\n");
    const result = inspectUpload("note.pdf", "application/pdf", pdf);
    expect(result.text).toContain("does not");
  });

  it("does not invent text for an image", () => {
    const result = inspectUpload("fig.png", "image/png", text("png-bytes"));
    expect(result.text).toBe("");
    expect(result.note).toMatch(/OCR is not configured/);
  });

  it("reports S3 as unavailable when credentials are absent", async () => {
    const store = s3ObjectStore({});
    expect(store.describe().ready).toBe(false);
    await expect(store.put("a/b", text("x"), "text/plain")).rejects.toThrow(
      /No object was uploaded/,
    );
    const bare = unconfiguredStore("missing");
    expect(bare.driver).toBe("unconfigured");
  });
});
