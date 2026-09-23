/**
 * Environment variable validation.
 *
 * S00 principle: the shell app must boot with NO external integrations
 * configured. Integration secrets are therefore optional here — their absence
 * yields an honest "unconfigured" adapter status rather than a fake success.
 * When a value IS present it must be well-formed (a clear configuration error,
 * never a silent fallback). Required-per-feature enforcement is added in the
 * slices that actually use each integration (S01+).
 */
import { z } from "zod";

/** A secret/config value that is optional, but if present must be non-empty. */
const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Persistence (S01/S03)
  DATABASE_URL: optionalNonEmpty,
  DATABASE_MIGRATION_URL: optionalNonEmpty,

  // Authentication (S01)
  BETTER_AUTH_SECRET: optionalNonEmpty,
  BETTER_AUTH_URL: optionalUrl,

  // Private artifact storage (S02). Local dir is a dev driver, not S3.
  S3_BUCKET: optionalNonEmpty,
  S3_REGION: optionalNonEmpty,
  KMS_KEY_ID: optionalNonEmpty,
  AWS_ACCESS_KEY_ID: optionalNonEmpty,
  AWS_SECRET_ACCESS_KEY: optionalNonEmpty,
  AWS_SESSION_TOKEN: optionalNonEmpty,
  OBJECT_STORE_LOCAL_DIR: optionalNonEmpty,

  // Worker authorization (S02/S03)
  WORKER_CALLBACK_SECRET: optionalNonEmpty,

  // Model routes (S04+). A model id is required before a live call; none is assumed.
  AI_GATEWAY_API_KEY: optionalNonEmpty,
  AI_INTAKE_MODEL: optionalNonEmpty,

  // Source/research providers (S06)
  USPTO_API_KEY: optionalNonEmpty,
  EPO_OPS_KEY: optionalNonEmpty,

  // Billing (S15)
  STRIPE_SECRET_KEY: optionalNonEmpty,
  STRIPE_WEBHOOK_SECRET: optionalNonEmpty,

  // Metadata-only analytics (S15)
  POSTHOG_KEY: optionalNonEmpty,
  POSTHOG_HOST: optionalUrl,

  // Redacted operations telemetry (S15/S16)
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,

  // Controlled legal rule-pack promotion (S05)
  RULEPACK_SIGNING_KEY: optionalNonEmpty,
});

export type Env = z.infer<typeof envSchema>;

export interface EnvParseSuccess {
  ok: true;
  env: Env;
}
export interface EnvParseFailure {
  ok: false;
  issues: string[];
}
export type EnvParseResult = EnvParseSuccess | EnvParseFailure;

/**
 * Parse and validate a raw environment record. Never throws; returns a
 * structured result so callers can surface a clear configuration error.
 */
export function parseEnv(raw: Record<string, string | undefined>): EnvParseResult {
  const parsed = envSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, env: parsed.data };
  }
  const issues = parsed.error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });
  return { ok: false, issues };
}
