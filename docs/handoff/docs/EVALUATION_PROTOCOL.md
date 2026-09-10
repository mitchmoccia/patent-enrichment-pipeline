# Quality Evaluation and Model Promotion

This protocol measures whether the platform delivers useful, supportable work. It does not certify an application as valid, enforceable, patentable, profitable, or equivalent to a lawyer. “Attorney-level” remains an unproven product objective until a defined independent benchmark supports a narrower, accurately described claim.

## 1 Evaluation units and separation

Evaluate the system at four levels: individual assertions/citations, stage outputs, complete matter packages, and operational behavior. Report each level separately. A high overall drafting score must never conceal a critical invented reference or cross-tenant disclosure.

Maintain three datasets with distinct access policies:

| Dataset | Content | Use |
|---|---|---|
| Development | Synthetic scenarios and rights-cleared examples | Prompt, interface and validator development |
| Frozen regression | Versioned defect cases and complete journeys | Release gates and reproducibility |
| Hidden evaluation | Matters not used for prompt tuning, with reviewer-created expectations | Quality comparison and model promotion |

Split by matter and related invention family rather than paragraph. Deduplicate near-identical documents and reference families across splits. Record which public information a model may already have encountered; public patent examples cannot establish absence of training contamination.

Use synthetic records exclusively in a separate test namespace. Rights-cleared confidential matters require the same provider consent and data handling as production. A contractor or practitioner reviewing a benchmark receives the minimum authorized matter scope.

## 2 Starting corpus

The following are proposed starting sample sizes, not a claim of statistical sufficiency:

- 30 complete software/AI invention matters spanning clear technical mechanisms, vague objectives, incremental developments, strong prior-art conflicts, and complex provenance.
- At least 120 independently specified defect cases covering the engineering and legal-analysis failures below.
- At least 10 complete golden journeys including intake, questions, revision, release, receipt reconciliation and a sample office-action cycle.
- Separate supported-domain and out-of-domain sets; initially exclude specialist biological, chemical, pharmaceutical and sequence-listing applications from final-release claims.

Before using results in a comparative marketing claim, commission a statistical plan appropriate to the chosen outcome, effect size and population. A small pilot is useful for finding problems and estimating review effort; it cannot establish world leadership.

## 3 Ground-truth record

For each evaluation case, preserve the input artifacts, source versions, confirmed facts, known unknowns, authorized processing policy, rule-pack version and expected material issues.

Two qualified patent practitioners independently annotate complete legal-analysis cases. Use technical specialists where the invention warrants them. Record relevant experience and conflicts. A third reviewer adjudicates material disagreement; preserve the original ratings.

Do not force a single “correct claim” when several defensible strategies exist. Gold records should identify essential constraints and acceptable reasoning ranges: supported disclosure, relevant art, required arrangement analysis, plausible claim scope, unresolved uncertainty and commercial objective.

Human annotations can be wrong. Provide an evidence-based challenge and correction process; changes to gold labels create a new dataset version and require relevant comparison results to be recalculated.

## 4 Experimental conditions

Compare defined conditions, such as practitioner with ordinary research tools, practitioner with the platform, and platform-generated draft before professional edits. Give each condition the same rights-cleared input packet and disclose differences in search access.

Use balanced assignment across matters and reviewers. Blind evaluators to the producing condition where feasible. Normalize document appearance enough to reduce branding bias without removing substantive provenance required to assess accuracy.

Record actual time, search and model costs, reviewer edit time, open issues and workflow failures. A polished draft that requires extensive correction is not a successful time-saving result.

If the same practitioner sees the same matter in multiple conditions, account for learning and carryover; a randomized assignment across different comparable matters may be more appropriate. Freeze the experiment design before collecting the claimed comparison.

## 5 Metrics

| Metric | Operational definition | Interpretation limit |
|---|---|---|
| Citation existence | Relied-on citations resolving to the stored exact source version / all relied-on citations | Existence does not establish proposition support |
| Quotation fidelity | Checked quotations matching their source span under declared normalization | OCR uncertainty must remain visible |
| Proposition support | Human-rated supported propositions / propositions reviewed | Include sampling method and uncertainty |
| Material issue recall | Gold material issues surfaced in the correct context / annotated material issues | Gold set may be incomplete |
| False positive burden | Unsupported material alerts and time spent resolving them | Excessive warnings can make a system unusable |
| Claim support quality | Reviewer ratings of each limitation and claimed combination | Individual term overlap is insufficient |
| Scope usefulness | Reviewer assessment of supported breadth and practical fallback positions | No universal numerical measure of breadth |
| Design-around quality | Plausible, benefit-preserving alternatives with accurate technical tradeoffs | Finite scenarios do not prove market-wide coverage |
| Eligibility reasoning | Claim-specific, current-rule, evidence-grounded reasoning | Not an allowance prediction |
| Technical coherence | Consistency of states, operations, figures and claimed effects | No substitute for actual experiments |
| Revision integrity | Required affected evaluations invalidated after material changes | Evaluate false invalidation as well as misses |
| Professional repair effort | Measured review/edit minutes and severity of repairs | Depends on matter complexity and reviewer |
| Commercial honesty | Assumptions visible; unsupported income/valuation precision absent | Does not establish business success |
| User task completion | Correct complete journeys without assistance or silent state loss | Report unresolved external prerequisites |

For legal and technical ratings, use an anchored ordinal scale such as 1–5 with concrete examples and reviewer guidance. Report distributions and disagreements, not only a mean. Use matter-level resampling or another reviewed method that respects clustered observations; thousands of paragraphs from one matter are not thousands of independent matters.

## 6 Defect families

Every critical fixture includes an input, a mutation or fault trigger, expected observable behavior, persisted-state assertions and a reason the behavior matters.

1. Evidence: fabricated reference; wrong source version; invented quotation; dropped negation; source unavailable but cited as reviewed.
2. Chronology: priority date substituted for publication; uncertain date treated as exact; later development backdated; sale/disclosure event omitted.
3. Claim analysis: AND/OR change; dependencies cycle; arrangement ignored; individual support collaged from incompatible embodiments; unsupported ranges.
4. Prior art: two references mislabeled as one-reference anticipation; combination without a reasoned argument; legal applicability confused with technical relevance.
5. Eligibility and disclosure: generic AI label as a cure; technical effect with no mechanism; hypothetical experiment stated as measured.
6. Inventorship and mode: AI proposal assigned to a human by a checkbox; inventor/applicant/owner conflated; LLC using an individual release route.
7. Independence: same fabricated citation accepted by multiple models; drafter closes its own unsupported objection; unresolved disagreements disappear in a summary.
8. Security: cross-tenant search hit; cross-matter foreign key; malicious repository instructions; public-query leakage; unauthorized provider fallback.
9. Execution: duplicate callback; stale worker fencing; orphaned budget hold; external timeout with unknown billing; cancellation after provider dispatch.
10. Documents: missing claim clause; altered symbol; wrong figure numeral; stale manifest; hidden comments; confidential review content in clean exports.
11. Filing/prosecution: downloaded equals filed; receipt mismatch; new matter inserted into amendment; wrong action baseline; unconfirmed deadline presented as definitive.
12. Commercial: fabricated buyer demand; invented licensing probability; market size treated as patent value; negative findings suppressed.

The supplied agent-spending fixture covers a subset. Cursor must implement the remaining cases as behavior tests against actual services, not tests that merely compare static fixture strings.

## 7 Initial release thresholds

Engineering and information-integrity requirements are mandatory before any confidential pilot:

- Zero observed cross-tenant reads, unauthorized egress, false filed states, stale releases, or leaked secrets in the required test suite.
- All relied-on citation identifiers and quotations in released benchmark packages verified against preserved sources; unavailable evidence is excluded from relied-on conclusions or explicitly unresolved.
- No known fabricated experiments, sources or contribution accounts.
- No unresolved critical defect in a released package.
- Every released package has matching file hashes and a current authorized human decision.
- All required crash, duplicate-event, isolation, export and restoration scenarios pass.

These are release criteria for tested cases. They do not imply a zero defect rate in all future cases.

Legal-analysis performance thresholds must be set with the practitioner panel after baseline measurement. Do not invent a target “90% patentable” score. Require no material quality regression on the defined benchmark, with documented exceptions if a new route trades cost or speed for lower quality in a clearly restricted use.

## 8 Model and prompt promotion

A candidate release comprises model/provider route, parameters, prompt version, tool registry, output schemas, retrieval strategy and relevant deterministic validators. Changing retrieval can change legal conclusions even when the model stays fixed.

Promotion sequence:

1. Verify data-processing compatibility and current provider behavior.
2. Run schema, security and citation fixtures.
3. Run stage and complete-matter regression cases with fixed inputs.
4. Conduct hidden evaluation and independent review for material changes.
5. Compare correctness, failure behavior, cost and latency with the active baseline.
6. Approve the route for specified tasks and data classifications.
7. Deploy to an explicitly consented pilot cohort; monitor.
8. Retain a rollback route and its provider-policy validity.

Record failed candidates. Do not repeatedly tune on the hidden set and continue describing it as unseen. Do not move traffic to a new provider solely because the current provider is unavailable.

## 9 Evaluation report artifact

Export a report containing dataset/version, rights and confidentiality scope, tested product commit, installed model route, rule packs, search providers, run dates, sample composition, exclusions, test failures, metric definitions, results, reviewer disagreements, actual costs, limitations and decision.

Include redacted representative defects and repair histories. Preserve evidence that supports the report privately. Public claims require review of both the measurement and the wording.

## 10 Ongoing operations

Sample completed matters only under authorized evaluation policy. Track complaint and correction categories without exposing content in analytics. A serious fabricated-source, isolation or stale-release incident disables the affected release path until containment and a reviewed repair are complete.

Monitor rule-source changes, provider terms, parsing quality, export fidelity and model route drift. Reevaluate affected snapshots when a material rule or evidence correction warrants it; do not silently rewrite historical filed records.

A later grant, office action, licensing event or court outcome can inform longitudinal research. None is a simple ground-truth label for the quality of every earlier drafting decision.

