#!/usr/bin/env node
/**
 * Validates the current environment against the platform schema and prints an
 * honest integration inventory. Exits non-zero on a malformed value so CI and
 * developers get a clear configuration error rather than a fake success.
 *
 * Requires @patent/contracts to be built (pnpm --filter @patent/contracts build).
 */
import { computeIntegrationStatus, parseEnv } from "@patent/contracts";

const result = parseEnv(process.env);
if (!result.ok) {
  console.error("Environment validation FAILED:");
  for (const issue of result.issues) console.error(`  - ${issue}`);
  process.exit(1);
}

const integrations = computeIntegrationStatus(result.env);
const configured = integrations.filter((i) => i.status === "configured").length;

console.log(`Environment valid (NODE_ENV=${result.env.NODE_ENV}).`);
console.log(`Integrations: ${configured}/${integrations.length} configured, 0 verified.\n`);
for (const i of integrations) {
  const missing = i.missingEnv.length ? ` (missing: ${i.missingEnv.join(", ")})` : "";
  console.log(`  [${i.status.padEnd(21)}] ${i.label}${missing}`);
}
