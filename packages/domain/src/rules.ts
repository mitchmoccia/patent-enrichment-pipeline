export interface LegalSource {
  sourceKey: string;
  title: string;
  kind: "agency_guidance";
  publishedOn: string;
  effectiveOn: string;
  supersededBy: string | null;
  reviewStatus: "seeded" | "promoted";
  counselApproved: false;
}

/** Public register only. Counsel has not approved either source. */
export const seededLegalSources: readonly LegalSource[] = [
  {
    sourceKey: "uspto-ai-inventorship-2024",
    title: "2024 USPTO AI inventorship guidance",
    kind: "agency_guidance",
    publishedOn: "2024-02-13",
    effectiveOn: "2024-02-13",
    supersededBy: "uspto-ai-inventorship-2025",
    reviewStatus: "seeded",
    counselApproved: false,
  },
  {
    sourceKey: "uspto-ai-inventorship-2025",
    title: "2025 USPTO revised inventorship guidance for AI-assisted inventions",
    kind: "agency_guidance",
    publishedOn: "2025-11-28",
    effectiveOn: "2025-11-28",
    supersededBy: null,
    reviewStatus: "seeded",
    counselApproved: false,
  },
];

export class RuleError extends Error {
  readonly code = "POLICY_BLOCKED" as const;
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

/** A superseded source cannot be chosen as the current rule. */
export function assertCurrentRule(source: { supersededBy: string | null }): void {
  if (source.supersededBy) {
    throw new RuleError("superseded guidance cannot be selected as current");
  }
}

export function ruleAlert(source: { supersededBy: string | null; reviewStatus: string }): string {
  if (source.supersededBy) return "stale";
  if (source.reviewStatus !== "promoted") return "seeded, not counsel-approved";
  return "promoted by a reviewer, not counsel-approved";
}
