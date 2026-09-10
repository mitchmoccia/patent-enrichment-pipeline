/**
 * Honest integration inventory.
 *
 * Per docs/handoff/docs/IMPLEMENTATION_DETAILS.md §12, integration readiness is
 * tracked as implemented / configured / verified rather than a single boolean.
 * S00 can only determine *configured* (are the required env vars present?).
 * "verified" (real credentials proven with a live test request) is established
 * in each integration's own slice and is therefore false here by design.
 */
import type { Env } from "./env.js";

export type IntegrationCategory =
  | "persistence"
  | "authentication"
  | "storage"
  | "workers"
  | "model_routes"
  | "research_sources"
  | "billing"
  | "analytics"
  | "telemetry"
  | "legal_rules";

export type ConfigurationStatus = "unconfigured" | "partially_configured" | "configured";

export interface IntegrationDefinition {
  id: string;
  label: string;
  category: IntegrationCategory;
  /** Slice that implements/verifies this integration (see BUILD_SLICES.md). */
  slice: string;
  /** Env var names that must all be present for this integration to be configured. */
  requiredEnv: (keyof Env)[];
  description: string;
}

export interface IntegrationStatus extends IntegrationDefinition {
  status: ConfigurationStatus;
  /** True only after a live, verified integration test in its slice (never at S00). */
  verified: boolean;
  presentEnv: string[];
  missingEnv: string[];
}

export const INTEGRATIONS: readonly IntegrationDefinition[] = [
  {
    id: "database",
    label: "Application database (Neon Postgres)",
    category: "persistence",
    slice: "S01/S03",
    requiredEnv: ["DATABASE_URL", "DATABASE_MIGRATION_URL"],
    description: "Scoped application connection plus a separate privileged migration connection.",
  },
  {
    id: "auth",
    label: "Authentication (Better Auth)",
    category: "authentication",
    slice: "S01",
    requiredEnv: ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"],
    description: "Sessions, organizations and MFA. Matter authorization stays application-owned.",
  },
  {
    id: "artifact_storage",
    label: "Private artifact storage (S3 + KMS)",
    category: "storage",
    slice: "S02",
    requiredEnv: ["S3_BUCKET", "S3_REGION", "KMS_KEY_ID"],
    description: "Immutable object versions with restricted, encrypted, signed access.",
  },
  {
    id: "workers",
    label: "Document worker callbacks",
    category: "workers",
    slice: "S02/S03",
    requiredEnv: ["WORKER_CALLBACK_SECRET"],
    description: "Signed, replay-protected worker job authorization and result callbacks.",
  },
  {
    id: "model_routes",
    label: "AI model routes (AI Gateway / provider)",
    category: "model_routes",
    slice: "S04+",
    requiredEnv: ["AI_GATEWAY_API_KEY"],
    description: "Approved, bounded model routes behind an application adapter.",
  },
  {
    id: "uspto",
    label: "USPTO source adapter",
    category: "research_sources",
    slice: "S06",
    requiredEnv: ["USPTO_API_KEY"],
    description: "Public patent discovery and record retrieval (exact coverage verified in S06).",
  },
  {
    id: "epo_ops",
    label: "EPO Open Patent Services adapter",
    category: "research_sources",
    slice: "S06",
    requiredEnv: ["EPO_OPS_KEY"],
    description: "Registered EPO OPS API access under fair-use terms.",
  },
  {
    id: "billing",
    label: "Billing (Stripe)",
    category: "billing",
    slice: "S15",
    requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    description: "Subscriptions, bounded paid runs and reconciled webhooks.",
  },
  {
    id: "analytics",
    label: "Product analytics (PostHog)",
    category: "analytics",
    slice: "S15",
    requiredEnv: ["POSTHOG_KEY", "POSTHOG_HOST"],
    description: "Metadata-only events; no confidential content capture.",
  },
  {
    id: "telemetry",
    label: "Operations telemetry (OpenTelemetry)",
    category: "telemetry",
    slice: "S15/S16",
    requiredEnv: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    description: "Redacted logs, trace IDs and gate/queue metrics.",
  },
  {
    id: "rulepack_signing",
    label: "Legal rule-pack promotion",
    category: "legal_rules",
    slice: "S05",
    requiredEnv: ["RULEPACK_SIGNING_KEY"],
    description: "Controlled, signed promotion of reviewed legal rule packs.",
  },
];

export function computeIntegrationStatus(env: Env): IntegrationStatus[] {
  return INTEGRATIONS.map((def) => {
    const presentEnv: string[] = [];
    const missingEnv: string[] = [];
    for (const key of def.requiredEnv) {
      if (env[key] !== undefined && env[key] !== "") {
        presentEnv.push(key as string);
      } else {
        missingEnv.push(key as string);
      }
    }
    let status: ConfigurationStatus;
    if (presentEnv.length === 0) {
      status = "unconfigured";
    } else if (missingEnv.length === 0) {
      status = "configured";
    } else {
      status = "partially_configured";
    }
    return { ...def, status, verified: false, presentEnv, missingEnv };
  });
}
