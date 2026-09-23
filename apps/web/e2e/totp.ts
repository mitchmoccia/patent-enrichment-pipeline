import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(input: string): Buffer {
  const cleaned = input
    .replace(/=+$/g, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of cleaned) {
    const value = alphabet.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

/** HMAC-SHA1 of the decoded secret. The URI stores that secret as base32. */
export function totpCode(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = (hmac.at(-1) ?? 0) & 0x0f;
  const binary =
    ((hmac[offset] ?? 0) & 0x7f) * 2 ** 24 +
    (hmac[offset + 1] ?? 0) * 2 ** 16 +
    (hmac[offset + 2] ?? 0) * 2 ** 8 +
    (hmac[offset + 3] ?? 0);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function currentTotp(secret: string): Promise<string> {
  const step = 30_000;
  const remaining = step - (Date.now() % step);
  if (remaining < 5_000) {
    await new Promise((resolve) => setTimeout(resolve, remaining + 250));
  }
  return totpCode(secret);
}

export function secretFromUri(uri: string): string {
  const secret = new URL(uri.trim()).searchParams.get("secret");
  if (!secret) throw new Error("Authenticator URI did not include a secret");
  return secret;
}

/** Persist the generated secret only in gitignored env files. */
export function rememberTotpSecret(secret: string): void {
  const targets = [new URL("../../../.env", import.meta.url), new URL("../.env", import.meta.url)];
  const line = `JOURNEY_TOTP_SECRET=${secret}`;
  for (const target of targets) {
    const current = readFileSync(target, "utf8");
    const next = /^JOURNEY_TOTP_SECRET=/m.test(current)
      ? current.replace(/^JOURNEY_TOTP_SECRET=.*$/m, line)
      : `${current.replace(/\n?$/, "\n")}${line}\n`;
    writeFileSync(target, next);
  }
}
