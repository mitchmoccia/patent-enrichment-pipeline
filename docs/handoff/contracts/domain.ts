/**
 * Architecture contracts for the Patent Enrichment Platform.
 * These types are not a production server or runtime validation.
 * Implement Zod schemas, authorization, database constraints and services.
 */
export type Id = string;
export type Digest = string;
export type ISODateTime = string;
export type GateId =
  | "G00" | "G01" | "G02" | "G03" | "G04" | "G05" | "G06"
  | "G07" | "G08" | "G09" | "G10" | "G11" | "G12" | "G13"
  | "G14" | "G15" | "G16";

export type OperatingMode =
  | "private_development"
  | "individual_self_filer"
  | "practitioner_supervised"
  | "entity_applicant";

export type GateOutcome =
  | "pending" | "running" | "pass" | "needs_information"
  | "needs_review" | "fail" | "not_applicable" | "stale";

export type MatterState =
  | "intake" | "developing" | "researching" | "drafting"
  | "review_required" | "package_prepared" | "released"
  | "filing_unconfirmed" | "filed" | "prosecution"
  | "granted_recorded" | "closed";

export type ReviewCapacity =
  | "inventor" | "individual_applicant" | "patent_agent"
  | "patent_attorney" | "technical_reviewer" | "administrator";

export interface Scope {
  tenantId: Id;
  matterId: Id;
}
export interface CommandContext extends Scope {
  actorId: Id;
  sessionId: Id;
  expectedRevision: number;
  idempotencyKey: string;
  purpose: string;
}
export interface DatedFact {
  value: string | null;
  precision: "instant" | "day" | "month" | "year" | "unknown";
  timezone?: string;
  basis: "official_record" | "source_metadata" | "person_statement" | "unknown";
  evidenceSpanIds: Id[];
  recordedAt: ISODateTime;
  confirmedBy?: Id;
}
export interface ProcessingPolicy {
  id: Id;
  version: string;
  allowedProviderRouteIds: Id[];
  allowedSourceAdapterIds: Id[];
  allowedRegions: string[];
  confidentialEgressAllowed: boolean;
  queryDisclosureApprovalId?: Id;
  trainingUseAllowed: false;
  retentionPolicyId: Id;
  dataAgreementRefs: Id[];
  budgetCapMicrousd: string;
  approvalActorId: Id;
  approvedAt: ISODateTime;
}
export interface Artifact extends Scope {
  id: Id;
  originalName: string;
  mediaType: string;
  sizeBytes: number;
  objectKey: string;
  objectVersion: string;
  sha256: Digest;
  origin: "upload" | "repository_snapshot" | "public_reference" | "derived" | "experiment";
  confidentiality: "public" | "internal" | "confidential" | "restricted";
  uploaderId: Id;
  recordedAt: ISODateTime;
  claimedCreationDate: DatedFact;
  ownershipStatus: "asserted_owned" | "licensed" | "public" | "third_party" | "unknown";
  scanStatus: "quarantined" | "clean" | "rejected";
  parentArtifactIds: Id[];
  transformationVersion?: string;
}
export type SourceLocator =
  | { kind: "pdf"; page: number; bbox?: [number, number, number, number] }
  | { kind: "docx"; paragraphId: string }
  | { kind: "code"; path: string; commitOrDigest: string; firstLine: number; lastLine: number }
  | { kind: "media"; startMs: number; endMs: number }
  | { kind: "text"; startOffset: number; endOffset: number };

export interface SourceSpan extends Scope {
  id: Id;
  artifactId: Id;
  artifactVersion: string;
  locator: SourceLocator;
  excerpt: string;
  normalizedExcerptSha256: Digest;
  extractionVersion: string;
  extractionQuality: "verified" | "machine_extracted" | "uncertain";
  verifiedBy?: Id;
}
export type AssertionClass =
  | "supplied_fact" | "observed_result" | "engineering_inference"
  | "proposed_embodiment" | "general_knowledge"
  | "legal_assessment" | "commercial_assumption";

export interface Assertion extends Scope {
  id: Id;
  version: number;
  text: string;
  classification: AssertionClass;
  sourceSpanIds: Id[];
  proposedBy: { kind: "person" | "model"; id: string };
  recordedAt: ISODateTime;
  status: "proposed" | "confirmed" | "disputed" | "rejected";
  confirmedBy?: Id;
  contributionReviewId?: Id;
  contradictsAssertionIds: Id[];
}
export interface Contribution extends Scope {
  id: Id;
  personId: Id;
  featureIds: Id[];
  account: string;
  evidenceSpanIds: Id[];
  assertedConceptionDate: DatedFact;
  aiAssistanceDescription?: string;
  reviewStatus: "unreviewed" | "confirmed_account" | "legal_review_required" | "reviewed";
  // Confirmed account is not a legal inventorship determination.
}
export interface Mechanism extends Scope {
  id: Id;
  problem: string;
  baselineDescription: string;
  actorIds: Id[];
  componentIds: Id[];
  operations: { id: Id; actorId: Id; input: string; condition: string; effect: string }[];
  states: { id: Id; label: string; ownerActorId: Id }[];
  transitions: { from: Id; to: Id; operationId: Id; guard: string }[];
  invariants: { id: Id; statement: string; assumptionIds: Id[] }[];
  assumptionIds: Id[];
  failureScenarios: { id: Id; trigger: string; expectedBehavior: string; evidenceIds: Id[] }[];
  technicalEffectAssertionIds: Id[];
  openQuestionIds: Id[];
}
export interface Embodiment extends Scope {
  id: Id;
  mechanismId: Id;
  assertionIds: Id[];
  compatibilityConditions: string[];
  limitations: string[];
  status: "proposed" | "developed" | "selected" | "excluded";
  selectedBy?: Id;
  developmentRecordIds: Id[];
}
export interface ReferenceVersion extends Scope {
  id: Id;
  canonicalId: string;
  kind: "patent_publication" | "patent_grant" | "paper" | "standard" | "code" | "product_document" | "legal_authority";
  publicationKindCode?: string;
  familyId?: string;
  sourceUrl: string;
  providerId: Id;
  artifactId: Id;
  title: string;
  publicationDate: DatedFact;
  priorityDates: DatedFact[];
  retrievedAt: ISODateTime;
  fullTextStatus: "available" | "partial" | "unavailable";
  cachingPermission: "permitted" | "restricted" | "unknown";
  legalStatus?: { value: string; asOf: ISODateTime; sourceSpanIds: Id[] };
}
export interface PriorArtEligibility {
  referenceVersionId: Id;
  claimVersionId: Id;
  status: "candidate" | "reviewed_applicable" | "reviewed_inapplicable" | "uncertain";
  assertedBasis: string;
  dateEvidenceSpanIds: Id[];
  exceptionIssues: string[];
  reviewerId?: Id;
}
export interface SearchManifest extends Scope {
  id: Id;
  snapshotId: Id;
  approvedPlanId: Id;
  queries: { id: Id; text: string; adapterId: Id; resultCount: number; completed: boolean }[];
  dateRange: { from?: string; to?: string };
  jurisdictions: string[];
  unavailableReferenceIds: Id[];
  providerErrors: { adapterId: Id; code: string }[];
  stopReason: "scope_completed" | "marginal_results" | "budget" | "needs_decision" | "user_stopped" | "provider_failure";
  coverageLimitations: string[];
}
export type ClaimLogic =
  | { kind: "limitation"; limitationId: Id }
  | { kind: "and" | "or"; children: ClaimLogic[] }
  | { kind: "ordered"; children: ClaimLogic[]; relation: string }
  | { kind: "conditional"; condition: string; consequence: ClaimLogic };

export interface ClaimVersion extends Scope {
  id: Id;
  claimId: Id;
  revision: number;
  number: number;
  category: "method" | "system" | "medium" | "other";
  text: string;
  dependsOnClaimIds: Id[];
  limitations: { id: Id; text: string; actorIds: Id[]; sourceTextRange: [number, number] }[];
  logic: ClaimLogic;
  parseStatus: "machine_proposed" | "reviewed" | "ambiguous";
  embodimentIds: Id[];
  previousVersionId?: Id;
}
export interface SupportLink extends Scope {
  id: Id;
  claimVersionId: Id;
  limitationIds: Id[];
  relationshipDescription?: string;
  disclosureParagraphIds: Id[];
  sourceSpanIds: Id[];
  supportKind: "individual_limitation" | "combination" | "ordering" | "parameter_range";
  assessment: "proposed" | "reviewed_supported" | "gap" | "disputed";
  sourceApplicationId?: Id;
  potentialEffectiveDate?: DatedFact;
  reviewerId?: Id;
}
export interface ArtMapping extends Scope {
  id: Id;
  claimVersionId: Id;
  referenceVersionIds: Id[];
  analysisKind: "anticipation" | "obviousness" | "technical_similarity";
  elementResults: { limitationId: Id; sourceSpanIds: Id[]; result: "present" | "absent" | "uncertain"; rationale: string }[];
  arrangementAnalysis: string;
  combinationRationale?: string;
  expectedSuccessAnalysis?: string;
  counterarguments: string[];
  eligibilityRecordIds: Id[];
  reviewerDisposition?: string;
}
export interface DesignAround extends Scope {
  id: Id;
  claimVersionIds: Id[];
  description: string;
  assumptions: string[];
  technicalTradeoffs: string[];
  elementMappings: { limitationId: Id; result: "present" | "absent" | "uncertain"; evidenceIds: Id[] }[];
  feasibility: "proposed" | "reviewed_plausible" | "tested_with_limits" | "rejected";
  legalConclusionStatus: "none" | "review_required" | "practitioner_reviewed";
  supportedResponseOptions: string[];
}
export interface DocumentParagraph {
  id: Id;
  sectionId: Id;
  text: string;
  assertionIds: Id[];
  claimLimitationIds: Id[];
  figureIds: Id[];
  status: "draft" | "proposed_edit" | "accepted";
}
export interface ApplicationDocument extends Scope {
  id: Id;
  revision: number;
  applicationType: "provisional" | "utility_nonprovisional" | "prosecution_response";
  sections: { id: Id; kind: string; title: string; paragraphIds: Id[] }[];
  paragraphs: DocumentParagraph[];
  claimVersionIds: Id[];
  figures: { id: Id; artifactId: Id; caption: string; numeralIds: Id[] }[];
  formTemplateVersionIds: Id[];
}
export interface MatterSnapshot extends Scope {
  id: Id;
  revision: number;
  parentSnapshotId?: Id;
  digest: Digest;
  artifactVersionIds: Id[];
  assertionVersionIds: Id[];
  claimVersionIds: Id[];
  documentRevisionIds: Id[];
  contributionRecordIds: Id[];
  researchManifestIds: Id[];
  rulePackId: Id;
  rulePackVersion: string;
  modelPolicyVersion: string;
  issueStateDigest: Digest;
  createdAt: ISODateTime;
}
export interface Finding extends Scope {
  id: Id;
  snapshotId: Id;
  gateId: GateId;
  code: string;
  severity: "info" | "minor" | "material" | "critical";
  blockClass: "integrity" | "reviewable" | "advisory";
  description: string;
  affectedIds: Id[];
  evidenceSpanIds: Id[];
  suggestedResolution: string;
  disposition: "open" | "fixed" | "resolved_with_evidence" | "risk_accepted" | "not_applicable";
  dispositionDecisionId?: Id;
}
export interface GateEvaluation extends Scope {
  id: Id;
  gateId: GateId;
  snapshotId: Id;
  dependencyDigest: Digest;
  policyVersion: string;
  outcome: GateOutcome;
  findingIds: Id[];
  evidenceArtifactIds: Id[];
  evaluator: { kind: "deterministic" | "model_proposed" | "human"; id: string };
  evaluatedAt: ISODateTime;
  carriedFromEvaluationId?: Id;
}
export interface HumanDecision extends Scope {
  id: Id;
  actorId: Id;
  capacity: ReviewCapacity;
  snapshotId: Id;
  targetIds: Id[];
  action: "confirm" | "reject" | "request_changes" | "accept_residual_risk" | "approve_release";
  rationale: string;
  evidenceIds: Id[];
  reauthenticatedAt?: ISODateTime;
  createdAt: ISODateTime;
}
export interface ReleaseApproval extends Scope {
  id: Id;
  actorId: Id;
  capacity: ReviewCapacity;
  operatingMode: OperatingMode;
  snapshotId: Id;
  snapshotDigest: Digest;
  packageId: Id;
  manifestDigest: Digest;
  gateEvaluationIds: Id[];
  residualRiskDecisionIds: Id[];
  practitionerVerificationId?: Id;
  engagementId?: Id;
  approvedAt: ISODateTime;
  revokedAt?: ISODateTime;
}
export interface PackageManifest extends Scope {
  id: Id;
  schemaVersion: string;
  snapshotId: Id;
  // Immutable content manifest. Excludes itself and detached approval records.
  files: { relativePath: string; artifactId: Id; sha256: Digest; purpose: "application" | "form" | "private_review" | "commercial" }[];
  renderReportId: Id;
  validationReportId: Id;
}
export interface PackageRecord extends Scope {
  id: Id;
  manifestId: Id;
  manifestDigest: Digest;
  status: "working" | "prepared" | "released";
  releaseApprovalIds: Id[];
}
export interface RoleResult<T> extends Scope {
  runId: Id;
  snapshotId: Id;
  roleId: string;
  roleVersion: string;
  promptVersion: string;
  schemaVersion: string;
  sourceIdsUsed: Id[];
  result: T;
  conciseRationale: string;
  unknowns: string[];
  providerRouteId: Id;
  modelId: string;
  providerRequestId?: string;
  usageRecordId: Id;
}
export interface ExternalOperation extends Scope {
  id: Id;
  idempotencyKey: string;
  requestHash: Digest;
  kind: "model_call" | "search" | "render" | "storage" | "billing";
  status: "prepared" | "dispatched" | "response_received" | "committed" | "unknown" | "cancelled";
  fencingToken: number;
  reservationId: Id;
  providerRequestId?: string;
  resultArtifactIds: Id[];
}
export interface DocketEvent extends Scope {
  id: Id;
  kind: string;
  sourceArtifactId: Id;
  sourceDate: DatedFact;
  proposedDueDate: DatedFact;
  confirmedDueDate?: DatedFact;
  rulePackVersion: string;
  extendibility: "review_required" | "confirmed_extendible" | "confirmed_nonextendible";
  responsibleActorId: Id;
  confirmedBy?: Id;
}
export interface CitationCheck {
  sourceExists: boolean;
  locatorValid: boolean;
  quotationMatches: boolean;
  propositionSupport: "unreviewed" | "supported" | "unsupported" | "uncertain";
  scopeAuthorized: boolean;
  errors: string[];
}
export interface SourceAdapterCapabilities {
  discovery: boolean;
  bibliographic: boolean;
  fullText: boolean;
  family: boolean;
  legalStatus: boolean;
  fileHistory: boolean;
  citations: boolean;
}
export interface AdapterHealth {
  adapterId: Id;
  status: "unconfigured" | "ready" | "degraded" | "blocked";
  capabilities: SourceAdapterCapabilities;
  limitations: string[];
  checkedAt: ISODateTime;
}
