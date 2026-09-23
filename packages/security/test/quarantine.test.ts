import { describe, expect, it } from "vitest";
import { assertSha256, QuarantineRejection, readZip, sha256Hex } from "../src/index.js";
import { declaredBomb, storedZip } from "./zip-fixture.js";

const text = (value: string) => new TextEncoder().encode(value);

describe("artifact quarantine", () => {
  it("rejects a hash that does not match the bytes", () => {
    const bytes = text("does not duplicate");
    expect(() => assertSha256(bytes, "ab".repeat(32))).toThrow(QuarantineRejection);
    expect(sha256Hex(bytes)).toHaveLength(64);
  });

  it("rejects an archive path that escapes the root", () => {
    const zip = storedZip([{ name: "../etc/passwd", data: text("root") }]);
    expect(() => readZip(zip)).toThrowError(/escapes the root/);
  });

  it("rejects an absolute archive path", () => {
    const zip = storedZip([{ name: "/etc/passwd", data: text("root") }]);
    expect(() => readZip(zip)).toThrowError(/absolute/);
  });

  it("rejects a declared decompression bomb before inflating", () => {
    expect(() => readZip(declaredBomb(5_000_000, 10))).toThrowError(/ratio/);
  });

  it("rejects macro content and does not return the macro bytes", () => {
    const zip = storedZip([
      { name: "word/document.xml", data: text("<w:t>safe</w:t>") },
      { name: "word/vbaProject.bin", data: text("macro") },
    ]);
    expect(() => readZip(zip)).toThrowError(/macro/);
  });

  it("returns a safe text entry unchanged", () => {
    const zip = storedZip([{ name: "notes/idea.txt", data: text("does not duplicate") }]);
    const entries = readZip(zip);
    expect(new TextDecoder().decode(entries[0]?.bytes)).toBe("does not duplicate");
  });
});
