#!/usr/bin/env node
/**
 * Validates the environment and prints an honest integration inventory. Exits
 * non-zero on a malformed value so CI and developers get a clear configuration
 * error rather than a fake success.
 *
 * Self-contained (no TypeScript import) so it runs under plain Node in CI,
 * where the internal packages ship source rather than compiled output. The
 * schema and inventory mirror @patent/contracts (env.ts + integrations.ts).
 */

const OPTIONAL_NONEMPTY = new Set([
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "BETTER_AUTH_SECRET",
  "S3_BUCKET",
  "S3_REGION",
  "KMS_KEY_ID",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "OBJECT_STORE_LOCAL_DIR",
  "WORKER_CALLBACK_SECRET",
  "AI_GATEWAY_API_KEY",
  "USPTO_API_KEY",
  "EPO_OPS_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "POSTHOG_KEY",
  "RULEPACK_SIGNING_KEY",
]);

const OPTIONAL_URL = new Set(["BETTER_AUTH_URL", "POSTHOG_HOST", "OTEL_EXPORTER_OTLP_ENDPOINT"]);

const INTEGRATIONS = [
  ["database", "Application database (Neon Postgres)", ["DATABASE_URL", "DATABASE_MIGRATION_URL"]],
  ["auth", "Authentication (Better Auth)", ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]],
  [
    "artifact_storage",
    "Private artifact storage (S3 + KMS)",
    ["S3_BUCKET", "S3_REGION", "KMS_KEY_ID", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  ],
  ["local_object_store", "Local development object store", ["OBJECT_STORE_LOCAL_DIR"]],
  ["workers", "Document worker callbacks", ["WORKER_CALLBACK_SECRET"]],
  ["model_routes", "AI model routes (AI Gateway / provider)", ["AI_GATEWAY_API_KEY"]],
  ["uspto", "USPTO source adapter", ["USPTO_API_KEY"]],
  ["epo_ops", "EPO Open Patent Services adapter", ["EPO_OPS_KEY"]],
  ["billing", "Billing (Stripe)", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]],
  ["analytics", "Product analytics (PostHog)", ["POSTHOG_KEY", "POSTHOG_HOST"]],
  ["telemetry", "Operations telemetry (OpenTelemetry)", ["OTEL_EXPORTER_OTLP_ENDPOINT"]],
  ["rulepack_signing", "Legal rule-pack promotion", ["RULEPACK_SIGNING_KEY"]],
];

function isUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const issues = [];
const env = {};

const nodeEnv = process.env.NODE_ENV || "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  issues.push(`NODE_ENV: must be development, test, or production`);
}
env.NODE_ENV = nodeEnv;

for (const key of OPTIONAL_NONEMPTY) {
  const raw = (process.env[key] ?? "").trim();
  if (raw) env[key] = raw;
}

for (const key of OPTIONAL_URL) {
  const raw = (process.env[key] ?? "").trim();
  if (!raw) continue;
  if (!isUrl(raw)) issues.push(`${key}: must be a valid URL`);
  else env[key] = raw;
}

if (issues.length) {
  console.error("Environment validation FAILED:");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

let configured = 0;
const rows = INTEGRATIONS.map(([id, label, required]) => {
  const present = required.filter((k) => env[k]);
  const missing = required.filter((k) => !env[k]);
  const status =
    present.length === 0
      ? "unconfigured"
      : missing.length === 0
        ? "configured"
        : "partially_configured";
  if (status === "configured") configured += 1;
  return { id, label, status, missing };
});

console.log(`Environment valid (NODE_ENV=${env.NODE_ENV}).`);
console.log(`Integrations: ${configured}/${rows.length} configured, 0 verified.\n`);
for (const r of rows) {
  const missing = r.missing.length ? ` (missing: ${r.missing.join(", ")})` : "";
  console.log(`  [${r.status.padEnd(21)}] ${r.label}${missing}`);
}
