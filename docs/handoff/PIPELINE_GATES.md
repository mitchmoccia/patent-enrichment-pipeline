# Pipeline Gates and Behavioral Contracts

This file specifies evaluation criteria for the platform described in PATENT_ENRICHMENT_ARCHITECTURE.md. Gate identifiers are stable application identifiers. The machine-readable catalog is policies/gates.json.

A **stage** creates or analyzes artifacts. A **gate** evaluates whether a defined state is acceptable for a purpose. Drafting and research can continue while a review gate is unresolved. Final release cannot bypass a required gate.

## Shared gate contract

Every evaluation records gate ID, policy version, matter ID, snapshot ID, dependency digest, evaluated artifact IDs, findings, outcome, evaluator type and time. An automated finding is a proposal until the relevant deterministic or human decision resolves it.

Outcomes are pending, running, pass, needs_information, needs_review, fail, not_applicable and stale. Not_applicable requires an allowed applicability rule and an explanation; a model cannot select it to avoid a failed check.

A new snapshot invalidates evaluations whose declared inputs changed. Unchanged evaluations can be carried forward only by a deterministic service that verifies identical dependency digests and creates a new binding to the successor snapshot. The original evaluation remains immutable. Human release approval always binds the entire final manifest and cannot be carried forward automatically.

A gate result includes a concise explanation of the result, evidence links, the next useful action, the responsible actor and the affected downstream records. A legal risk accepted after review remains visible as a residual risk, not relabeled as legally disproven.

## G00 Mandate and data processing

**Inputs:** User goal, jurisdiction, inventor/applicant intention, approved processors, confidentiality policy, artifact scope, run budget, and operating mode.

**Actions:** Verify membership and matter access; resolve private development, individual self-filer, practitioner or entity mode; select a compatible processing route; reserve initial budget; record external-action exclusions.

**Pass:** The authorized actor has approved this processing scope; all planned providers and destinations are allowed; budget is available.

**Blocks:** No authorized actor, policy mismatch, unspecified confidential egress destination, or insufficient budget.

**Recovery:** Present an alternative compliant route or a concrete cost/policy choice. Keep work completed under prior authorization.

**Test:** A provider fallback tries to use a disallowed region. It must be rejected before any payload leaves the system.

## G01 Artifact integrity and extraction

**Inputs:** Immutable uploaded objects, expected digests, content metadata and parsing policies.

**Actions:** Quarantine, scan, inspect archives, parse, OCR when needed, and create source spans. Record extraction gaps and corrections.

**Pass:** Required objects are authentic to the uploaded hashes, processing is safe, and relevant content is readable with documented limitations.

**Blocks:** Malware, digest mismatch, unsafe archive paths, corrupted required files, or material text whose interpretation is unreliable.

**Recovery:** Request a replacement or an inventor-confirmed transcription. Preserve the original for provenance under applicable retention rules.

**Test:** OCR changes “does not reuse” to “does reuse.” The conflict must generate a material issue and prevent reliance on the altered passage.

## G02 Mechanism sufficiency

**Inputs:** Idea, extracted artifacts, assertions, inventor answers and accepted development records.

**Actions:** Model actors, components, operations, states, invariants, trust boundaries, technical effect and failure cases. Identify what makes the mechanism different from a desired result.

**Pass:** At least one coherent implementation can be explained and the essential unknowns are resolved or consciously excluded from scope.

**Blocks:** Missing core mechanism, contradictory behavior, or required performance asserted without support.

**Recovery:** Ask targeted questions or propose engineering experiments. Draft only an explicitly incomplete outline when the mechanism remains undeveloped.

**Test:** “An AI that prevents all overspending” produces questions about allocation, enforcement and recovery; it does not produce a completed invention attributed to the user.

## G03 Inventorship ownership and chronology

**Inputs:** Human contribution accounts, employer/customer obligations, assignments, candidate claim features, existing applications, public disclosures, sale-related events and dates.

**Actions:** Keep inventor, applicant, owner and obligation-to-assign fields distinct. Map contribution evidence to features. Track AI involvement without treating the model as a human inventor. Identify uncertain dates and authority.

**Pass:** Required identities and contributions are recorded; material disputes have an appropriate reviewed disposition; the applicant mode is consistent with the rights record.

**Blocks:** Fabricated contribution or date, unresolved required identity, conflicting authority, or an entity release routed as an individual self-filing merely to avoid representation requirements.

**Recovery:** Obtain actual contributor statements or practitioner analysis. A user clicking “accept AI suggestion” does not automatically cure inventorship.

**Test:** A new mechanism proposed after a recorded provisional filing is assigned its actual development record, not the provisional date.

**Authority:** [Representation](https://www.uspto.gov/web/offices/pac/mpep/s401.html), [current AI inventorship guidance](https://www.federalregister.gov/documents/2025/11/28/2025-21457/revised-inventorship-guidance-for-ai-assisted-inventions).

## G04 Research scope and current authority

**Inputs:** Mechanism, draft claim candidates, timeline, provider availability, approved egress, jurisdiction and legal-source registry.

**Actions:** Produce a multi-perspective query plan; identify corpus gaps; choose a reviewed rule pack; identify necessary primary sources.

**Pass:** Research plan and legal-rule version are recorded, sources are available or limits explicitly reviewed, and outbound query scope is authorized.

**Blocks:** Unapproved egress, unavailable required authority, or reliance on a known superseded rule.

**Recovery:** Use an approved alternative source or manual import, or pause only the dependent conclusion.

**Test:** A cached 2024 AI inventorship rule is retrieved alongside the 2025 replacement. The replacement governs the active rule pack; the old source is historical.

## G05 Prior art novelty and obviousness

**Inputs:** Candidate or selected claim text, reviewed parse, exact public-source versions and dates, query results and search coverage manifest.

**Actions:** Independently analyze single-reference anticipation and reasoned combinations for obviousness. Show mappings, counterarguments, disputed date treatment, and inaccessible evidence.

**Pass for release:** The planned search scope is completed or a disclosed limitation has been reviewed; relied-on references and quotations are verified; material prior-art findings have reviewed dispositions for the current claims.

**Blocks:** Fabricated reference or quote; material mapping based only on an unreliable snippet; undisclosed search outage; unresolved dispositive finding.

**Recovery:** Retrieve the actual text, correct the date, revise supported claims, expand search, or recommend stopping investment.

**Test:** Two unrelated references each contain half the features. The system must not call that single-reference anticipation. Any combination argument needs its own rationale.

**Authority:** [Anticipation](https://www.uspto.gov/web/offices/pac/mpep/s2131.html), [obviousness](https://www.uspto.gov/web/offices/pac/mpep/s2141.html).

## G06 Subject matter eligibility

**Inputs:** Exact claim wording, technical mechanism, relevant disclosure and current jurisdiction rules.

**Actions:** Analyze actual claim operations and asserted improvement. Distinguish technical specificity from adding a generic processor to a business objective.

**Pass for release:** A claim-specific assessment exists, supporting assertions are traceable, and material issues have an authorized reviewed disposition.

**Blocks:** An unsupported technical effect used as the eligibility rationale, stale rule reliance, or an unresolved material eligibility issue.

**Recovery:** Develop the actual technical contribution, adjust supported scope, seek practitioner review or stop the candidate.

**Test:** Changing “budget allocation” to “AI blockchain budget allocation” must not automatically turn an eligibility concern into a pass.

**Authority:** [Eligibility framework](https://www.uspto.gov/web/offices/pac/mpep/s2106.html).

## G07 Embodiments and design around analysis

**Inputs:** Invention model, current claim candidates, existing alternatives and technical constraints.

**Actions:** Propose viable substitutions and architectural workarounds. Explain their feasibility, costs, assumptions, coverage and differences. Keep new proposals on a separate development branch.

**Pass:** The planned adversarial scenario set is complete; viable workarounds and unsupported alternatives are visible; selected embodiments have appropriate technical confirmation.

**Blocks:** Unsupported variants inserted as inventor facts, impossible alternatives presented as demonstrated, or unreviewed critical dependencies.

**Recovery:** Develop the missing mechanism, narrow a proposed embodiment or leave it out of the selected application.

**Test:** An offline spending embodiment cannot claim the same global conservation and availability properties as an online coordinator without a specified authority-partition scheme.

## G08 Claim architecture

**Inputs:** Accepted mechanisms, reviewed art and eligibility issues, embodiments, terminology and proposed claim families.

**Actions:** Draft and compare supported scope, commercial implementation and fallbacks. Parse logic and relationships; check dependencies; map actors and observability.

**Pass:** Claim structure is syntactically sound, materially unambiguous for analysis, and all selected limitations and combinations have reviewed support candidates.

**Blocks:** Dependency cycles, unsupported scope expansion, unresolved parsing ambiguity affecting coverage, or misleading market-wide claims based on finite scenarios.

**Recovery:** Correct structure, add legitimate disclosure before filing, develop the invention, or choose narrower defensible claims.

**Test:** Deleting “only after durable reservation” from a claim must trigger new support, art, eligibility and design-around analysis.

**Authority:** [Claim clarity](https://www.uspto.gov/web/offices/pac/mpep/s2173.html), [functional limitations](https://www.uspto.gov/web/offices/pac/mpep/s2181.html).

## G09 Disclosure and figures

**Inputs:** Selected claims, accepted embodiment graph, experiment provenance, priority records and document tree.

**Actions:** Draft the specification, abstract and figures; verify support, terminology, numerals, technical consistency, combination support and applicable formal structure.

**Pass:** Required sections exist; claim limitations and combinations have reviewed disclosure support; material contradictions are resolved; measured claims trace to real results.

**Blocks:** Fabricated experiment, unsupported essential mechanism, missing required disclosure, figure-text conflict, or backdated support.

**Recovery:** Obtain missing inventor information, revise text accurately, remove an unsupported claim, or obtain advice on a later filing.

**Test:** A chart saying “99.99% reliable” from a proposed benchmark must not appear as an observed result.

**Authority:** [Written description](https://www.uspto.gov/web/offices/pac/mpep/s2163.html), [enablement](https://www.uspto.gov/web/offices/pac/mpep/s2164.html), [earlier-filing benefit](https://www.uspto.gov/web/offices/pac/mpep/s211.html).

## G10 Independent challenge and reconciliation

**Inputs:** Frozen proposed application and research record.

**Actions:** Run independent technical and legal challenges, source spot-checks, contradiction review and design-around verification. Present disagreements without manufacturing consensus.

**Pass:** All material findings have a defensible disposition; unresolved issues are accurately classified and no integrity block remains.

**Blocks:** Drafter dismisses its own critical objection without evidence, unsupported citation survives review, or a repair changes the snapshot without rerunning affected checks.

**Recovery:** Assign targeted human review or create a successor revision. Limit repetitive repairs.

**Test:** Three models agree on a nonexistent citation. Deterministic verification blocks it regardless of agreement.

## G11 Commercial assessment

**Inputs:** Goal, target market, buyer evidence, known substitutes, implementation readiness and cost assumptions.

**Actions:** Assess operating, licensing/sale and defensive strategies. Record economic hypotheses, cost range sources, design-around practicality and evidence needed.

**Pass:** Assessment is complete and assumptions are transparent. A recommendation to defer or stop can pass this gate.

**Blocks:** Invented customer demand, fictional licensing probability, or unsupported patent valuation used as an established fact.

**Recovery:** Remove unsupported precision, seek customer evidence, or choose a research-only objective.

**Test:** A large market estimate does not imply demand for the specific claimed mechanism.

## G12 Reproducible export

**Inputs:** Final snapshot, current format rules, canonical document tree, figures and form templates.

**Actions:** Generate DOCX/PDF and structured exports; compare text; render pages; inspect layout; strip review-only data; produce hashes and a manifest.

**Pass:** Required files are present, internally consistent and accurately rendered. Clean/review folders are correctly separated.

**Blocks:** Missing claim clause, corrupted formula, hidden comments, invalid signature insertion, incorrect form data, or incomplete package manifest.

**Recovery:** Regenerate the affected file and repeat exact-content and rendering checks.

**Test:** A renderer silently drops a subparagraph. The content comparison must fail before release.

## G13 Human release

**Inputs:** All current pre-filing gates, unresolved/residual issues, final file hashes, reviewer identity and operating mode.

**Actions:** Reauthenticate, show exact files and decisions, verify actor capacity, record approval and freeze the release.

**Pass:** Authorized human approves the exact manifest with all mandatory integrity checks satisfied. Practitioner-reviewed status requires an actual assigned practitioner approval.

**Blocks:** Stale approval, wrong capacity, unconfirmed entity representation, changed files, or an unresolved non-waivable integrity defect.

**Recovery:** Correct the issue and seek approval of the concrete successor package. Working exports remain available with an accurate separate status report.

**Test:** Approve package A, edit one limitation and request release of B. The old approval cannot authorize B.

## G14 Filing receipt reconciliation

**Inputs:** Official receipt, actually submitted documents and authorized filer confirmation.

**Actions:** Extract and reconcile identifiers, dates, fees and document lists; compare submitted content with the released files; freeze a filed baseline.

**Pass:** Evidence supports the recorded filing facts. Any mismatch is resolved.

**Blocks:** No receipt, contradictory document list, unverified filing identifier, or uncertain duplicate submission.

**Recovery:** Obtain authoritative records. Never automatically resubmit to resolve uncertainty.

**Test:** An export download and a user checkbox cannot produce a verified filed status without appropriate evidence.

## G15 Prosecution cycle

**Inputs:** Filed baseline, official action, cited art, confirmed docket information and proposed changes.

**Actions:** Analyze objections/rejections, develop supported response options, show scope impacts, manage disclosure candidates, and run affected gates against the proposed response.

**Pass:** Response readiness is reviewed for the correct action and current claims, original support is mapped, and deadline and authority are confirmed. Final response release additionally requires the new package's G12/G13; G15 readiness must precede that release to avoid a circular approval dependency.

**Blocks:** Unsupported amendment, wrong action baseline, unverified citation, missed or ambiguous critical deadline, or contradictory prosecution argument left unresolved.

**Recovery:** Reconcile the record, revise the response or escalate to the responsible practitioner.

**Test:** A newly invented recovery feature cannot be inserted as if disclosed in the originally filed application.

## G16 Portfolio watch

**Inputs:** Explicit watch plan, approved sources, cadence, budget and portfolio identifiers.

**Actions:** Retrieve changed public evidence, deduplicate alerts, map potentially relevant elements and create private review tasks.

**Pass:** Scheduled check was completed within its source scope, or honestly reported incomplete; no unsupported infringement conclusion or external outreach is emitted.

**Blocks:** Unauthorized recurring spend, unapproved sources, fabricated match evidence, or attempted automatic accusation.

**Recovery:** Pause the watch or adjust the approved plan. Preserve existing alerts.

**Test:** A product advertises “prevents overspending.” Create a low-information research lead, not a determination that it practices a specific claim.

## Release profiles

- **Working draft:** may export incomplete work with a separate status manifest. It cannot receive final or practitioner-reviewed labels.
- **US individual self-filer:** G00-G13 evaluated for the selected snapshot; professional review is optional unless the specific case or selected product mode requires it; recorded self-review is mandatory.
- **US practitioner supervised:** G00-G13 plus assigned practitioner approval.
- **US entity applicant:** practitioner-supervised release with entity representation verified.
- **Prosecution response:** G15 plus all changed-content gates and a new G12/G13 package release.
- **International or unsupported-domain matter:** development export only until an approved rule/domain pack and qualified review route exist.

G05 and G06 assessments occur early to inform development and again as needed on the final claim revision. Gate prerequisites in the policy catalog describe evaluation and release dependencies, not a requirement to stop all exploratory drafting until each preliminary legal issue is resolved.
