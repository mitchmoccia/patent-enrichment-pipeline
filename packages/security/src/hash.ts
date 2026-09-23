import { createHash } from "node:crypto";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export class QuarantineRejection extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "QuarantineRejection";
    this.code = code;
  }
}

export function assertSha256(bytes: Uint8Array, claimedHex: string): string {
  const actual = sha256Hex(bytes);
  const claimed = claimedHex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(claimed) || actual !== claimed) {
    throw new QuarantineRejection(
      "HASH_MISMATCH",
      "The bytes do not match the claimed SHA-256. Nothing was stored as evidence.",
    );
  }
  return actual;
}
