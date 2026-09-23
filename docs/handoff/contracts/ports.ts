/**
 * Integration and application ports. Implement server-side adapters and Zod
 * schemas; never expose these capabilities directly to model-selected input.
 */
import type {
  AdapterHealth, Artifact, CitationCheck, CommandContext, Digest,
  GateEvaluation, GateId, Id, MatterSnapshot, PackageManifest,
  ReleaseApproval, Scope, SourceAdapterCapabilities
} from "./domain";

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };

export interface DomainError {
  code:
    | "UNAUTHORIZED" | "NOT_FOUND" | "REVISION_CONFLICT"
    | "IDEMPOTENCY_CONFLICT" | "GATE_BLOCKED" | "POLICY_BLOCKED"
    | "PROVIDER_UNAVAILABLE" | "SOURCE_UNAVAILABLE" | "BUDGET_EXCEEDED"
    | "EXTERNAL_OUTCOME_UNKNOWN" | "REPRESENTATION_REQUIRED"
    | "VALIDATION_FAILED";
  message: string;
  retryable: boolean;
  issueIds: Id[];
  requestId: Id;
}

export interface AuthorizedContext extends Scope {
  // Created by the server from verified identity and ACL, never a client body.
  actorId: Id;
  policyVersion: string;
  processingPolicyId: Id;
  operationPurpose: string;
  correlationId: Id;
  capabilityIds: string[];
}

export interface ApprovedQuery extends Scope {
  id: Id;
  text: string;
  adapterId: Id;
  planId: Id;
  disclosureApprovalId: Id;
  authorizationDigest: Digest;
  dateFilters?: { from?: string; to?: string };
  languages: string[];
  corpusKinds: string[];
  maxResults: number;
}

export interface BibliographicHit {
  providerRecordId: string;
  canonicalId?: string;
  title: string;
  sourceUrl: string;
  snippet?: string;
  // Discovery metadata is unverified until authoritative retrieval.
  publicationDateText?: string;
  familyId?: string;
}

export interface SourceSearchPage {
  hits: BibliographicHit[];
  nextCursor?: string;
  providerRequestId?: string;
  completeness: "within_declared_scope" | "partial" | "unknown";
  limitations: string[];
}

export interface SourceFetchResult {
  providerRecordId: string;
  permittedOriginalArtifactId?: Id;
  retrievalStatus: "complete" | "partial" | "not_found" | "access_denied";
  mimeType?: string;
  sourceUrl: string;
  retrievedAt: string;
  rightsRecordId: Id;
  limitations: string[];
}

export interface SourceAdapter {
  readonly id: Id;
  readonly version: string;
  readonly capabilities: SourceAdapterCapabilities;
  health(context: AuthorizedContext): Promise<AdapterHealth>;
  search(
    context: AuthorizedContext,
    query: ApprovedQuery,
    cursor?: string
  ): Promise<Result<SourceSearchPage>>;
  fetch(
    context: AuthorizedContext,
    providerRecordId: string
  ): Promise<Result<SourceFetchResult>>;
}
// Add capability-specific interfaces for family/status/history access only
// when implemented and verified; an unsupported capability remains false.

export interface CitationVerifier {
  verify(
    context: AuthorizedContext,
    sourceSpanId: Id,
    proposedQuote: string,
    proposition?: string
  ): Promise<CitationCheck>;
}

export interface GateEvaluator {
  evaluate(input: {
    context: AuthorizedContext;
    gateId: GateId;
    snapshot: MatterSnapshot;
    dependencyDigest: Digest;
    policyVersion: string;
  }): Promise<Result<GateEvaluation>>;
}

export interface ExportService {
  prepare(input: {
    context: AuthorizedContext;
    snapshotId: Id;
    exportProfileId: Id;
    commandId: Id;
  }): Promise<Result<{ jobId: Id }>>;
  readManifest(
    context: AuthorizedContext,
    packageId: Id
  ): Promise<Result<PackageManifest>>;
}

export interface ReleaseCommand {
  command: CommandContext;
  snapshotId: Id;
  snapshotDigest: Digest;
  packageId: Id;
  manifestDigest: Digest;
  releaseProfileId: Id;
  residualRiskDecisionIds: Id[];
  reauthenticationProofId: Id;
}

export interface ReleaseService {
  approve(input: ReleaseCommand): Promise<Result<ReleaseApproval>>;
}

export interface WorkerJobEnvelope extends Scope {
  version: string;
  jobId: Id;
  runId: Id;
  stageId: Id;
  attemptId: Id;
  fencingToken: number;
  inputArtifactIds: Id[];
  expectedInputDigests: Digest[];
  processingPolicyId: Id;
  processingPolicyVersion: string;
  outputObjectPrefix: string;
  capabilityTokenId: Id;
  expiresAt: string;
}
// Envelope is delivered over authenticated transport. Server signs/verifies
// capability scope; model text cannot construct an authorized worker job.

export interface WorkerResult {
  jobId: Id;
  attemptId: Id;
  fencingToken: number;
  status: "completed" | "failed";
  outputArtifacts: Pick<Artifact, "id" | "sha256" | "mediaType" | "sizeBytes">[];
  diagnosticsArtifactId?: Id;
  errorCode?: string;
}

export interface MatterEvent<T = Record<string, unknown>> extends Scope {
  id: Id;
  sequence: string;
  schemaVersion: string;
  type:
    | "snapshot.created" | "run.started" | "stage.updated"
    | "question.created" | "finding.created" | "gate.evaluated"
    | "package.prepared" | "release.approved" | "filing.reconciled"
    | "budget.updated" | "source.degraded";
  snapshotId?: Id;
  runId?: Id;
  occurredAt: string;
  payload: T;
}
// Client-visible payloads contain authorized metadata; details are fetched
// through scoped queries. Provider traces and invention text are not broadcast.

