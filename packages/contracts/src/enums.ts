/**
 * Canonical enumerations from the architecture handoff, expressed as Zod
 * schemas so they can validate runtime boundaries and infer static types.
 * Source of truth: docs/handoff/contracts/domain.ts + policies/*.json.
 */
import { z } from "zod";

export const gateIdSchema = z.enum([
  "G00",
  "G01",
  "G02",
  "G03",
  "G04",
  "G05",
  "G06",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
  "G16",
]);
export type GateId = z.infer<typeof gateIdSchema>;

export const operatingModeSchema = z.enum([
  "private_development",
  "individual_self_filer",
  "practitioner_supervised",
  "entity_applicant",
]);
export type OperatingMode = z.infer<typeof operatingModeSchema>;

export const gateOutcomeSchema = z.enum([
  "pending",
  "running",
  "pass",
  "needs_information",
  "needs_review",
  "fail",
  "not_applicable",
  "stale",
]);
export type GateOutcome = z.infer<typeof gateOutcomeSchema>;

export const matterStateSchema = z.enum([
  "intake",
  "developing",
  "researching",
  "drafting",
  "review_required",
  "package_prepared",
  "released",
  "filing_unconfirmed",
  "filed",
  "prosecution",
  "granted_recorded",
  "closed",
]);
export type MatterState = z.infer<typeof matterStateSchema>;

export const reviewCapacitySchema = z.enum([
  "inventor",
  "individual_applicant",
  "patent_agent",
  "patent_attorney",
  "technical_reviewer",
  "administrator",
]);
export type ReviewCapacity = z.infer<typeof reviewCapacitySchema>;

export const assertionClassSchema = z.enum([
  "supplied_fact",
  "observed_result",
  "engineering_inference",
  "proposed_embodiment",
  "general_knowledge",
  "legal_assessment",
  "commercial_assumption",
]);
export type AssertionClass = z.infer<typeof assertionClassSchema>;

/** Stable domain error codes (mirrors contracts/ports.ts DomainError). */
export const domainErrorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "NOT_FOUND",
  "REVISION_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "GATE_BLOCKED",
  "POLICY_BLOCKED",
  "PROVIDER_UNAVAILABLE",
  "SOURCE_UNAVAILABLE",
  "BUDGET_EXCEEDED",
  "EXTERNAL_OUTCOME_UNKNOWN",
  "REPRESENTATION_REQUIRED",
  "VALIDATION_FAILED",
]);
export type DomainErrorCode = z.infer<typeof domainErrorCodeSchema>;
