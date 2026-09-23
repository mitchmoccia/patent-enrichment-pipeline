import "server-only";
import { type Env, parseEnv } from "@patent/contracts";

let cached: Env | null = null;

/**
 * Server-side validated environment access. Fails fast with a clear message if
 * a provided value is malformed, but does not require any integration to be
 * configured (the shell boots unconfigured by design).
 */
export function getEnv(): Env {
  if (cached) return cached;
  const result = parseEnv(process.env);
  if (!result.ok) {
    throw new Error(
      `Invalid environment configuration:\n${result.issues.map((i) => `  - ${i}`).join("\n")}`,
    );
  }
  cached = result.env;
  return cached;
}
