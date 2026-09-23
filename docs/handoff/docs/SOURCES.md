# Source Register and Verification Notes

Research date: September 10, 2026. These are primary sources used to ground the architecture. They are source seeds for implementation, not an attorney-approved executable legal rule pack. The complete legal hierarchy, amendments, case treatment, source dates and applicability must be maintained by the product's reviewed rule process.

## Legal and filing sources

| ID | Primary source | Architectural use |
|---|---|---|
| L01 | [USPTO self-filing assistance](https://www.uspto.gov/patents/basics/using-legal-services/pro-se-assistance-program) | Individual self-filer mode and accurate educational framing |
| L02 | [MPEP 401: Applicant representation](https://www.uspto.gov/web/offices/pac/mpep/s401.html) | Applicant capacity and practitioner route for an entity |
| L03 | [Revised AI inventorship guidance, November 2025](https://www.federalregister.gov/documents/2025/11/28/2025-21457/revised-inventorship-guidance-for-ai-assisted-inventions) | Current human-conception analysis and explicit supersession of the 2024 inventorship guidance |
| L04 | [USPTO AI-tool practice guidance, April 2024](https://www.federalregister.gov/documents/2024/04/11/2024-07629/guidance-on-use-of-artificial-intelligence-based-tools-in-practice-before-the-united-states-patent) | Professional responsibility, output review and data-handling considerations |
| L05 | [MPEP 2106: Eligibility](https://www.uspto.gov/web/offices/pac/mpep/s2106.html) | Claim-specific eligibility review |
| L06 | [MPEP 2131: Anticipation](https://www.uspto.gov/web/offices/pac/mpep/s2131.html) | Separate single-reference analysis |
| L07 | [MPEP 2141: Obviousness](https://www.uspto.gov/web/offices/pac/mpep/s2141.html) | Reasoned combination analysis and counterarguments |
| L08 | [MPEP 2163: Written description](https://www.uspto.gov/web/offices/pac/mpep/s2163.html) | Limitation and combination support |
| L09 | [MPEP 2164: Enablement](https://www.uspto.gov/web/offices/pac/mpep/s2164.html) | Disclosure sufficiency over selected scope |
| L10 | [MPEP 2173: Definiteness](https://www.uspto.gov/web/offices/pac/mpep/s2173.html) | Claim clarity and ambiguity review |
| L11 | [MPEP 2181: Functional limitations](https://www.uspto.gov/web/offices/pac/mpep/s2181.html) | Contextual section 112(f) issue detection |
| L12 | [MPEP 211: Earlier-filing benefit](https://www.uspto.gov/web/offices/pac/mpep/s211.html) | Actual support and continuity records |
| L13 | [MPEP 2152: AIA prior-art conditions](https://www.uspto.gov/web/offices/pac/mpep/s2152.html) | Date and legal-applicability records |
| L14 | [MPEP 2001: Duty of disclosure](https://www.uspto.gov/web/offices/pac/mpep/s2001.html) | Material-reference tracking and reviewed dispositions |
| L15 | [MPEP 609: Information disclosure statements](https://www.uspto.gov/web/offices/pac/mpep/s609.html) | IDS candidate and submission workflow |
| L16 | [MPEP 608: Disclosure](https://www.uspto.gov/web/offices/pac/mpep/s608.html) | Specification/claim/drawing formalities and application profiles |
| L17 | [MPEP 140: Foreign filing licenses](https://www.uspto.gov/web/offices/pac/mpep/s140.html) | Route-specific international disclosure and license review |
| L18 | [USPTO provisional applications](https://www.uspto.gov/patents/basics/apply/provisional-application) | Separate application types and later-support constraints |
| L19 | [USPTO Patent Center](https://www.uspto.gov/patents/apply/patent-center) | Official manual handoff and receipt-based filing records |
| L20 | [USPTO DOCX guidance](https://www.uspto.gov/patents/docx) | Current format checks and official rendering review |
| L21 | [WIPO IP valuation](https://www.wipo.int/en/web/business/ip-valuation) | Commercial scenarios grounded in valuation inputs |

L03 and L04 are different notices. The 2025 replacement concerns inventorship guidance; do not automatically mark all 2024 AI practice guidance as rescinded.

USPTO guidance and the MPEP do not replace statutes, regulations or applicable court decisions. The rule registry must preserve authority type and subsequent treatment. Production counsel must review the actual rules selected for each supported jurisdiction and application category.

The product's mandatory research and review gates are product quality policies. Do not describe every product gate as a universal legal prerequisite to filing.

## Research services

| ID | Official source | Verification boundary |
|---|---|---|
| R01 | [USPTO Patent Public Search](https://www.uspto.gov/patents/search/patent-public-search) | Public search service; this does not establish an unrestricted scraping or automation right |
| R02 | [USPTO Open Data Portal](https://data.uspto.gov/) | Portal discovery only; exact endpoint, authentication, coverage and licensing must be verified during adapter implementation |
| R03 | [EPO Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | Documented service exists; implement only actual entitled capabilities and fair-use limits |

A public webpage and a production API are different capabilities. No adapter is considered live because its name appears in this document. Record credential setup, source terms, test requests, full-text coverage, permitted storage and actual failure behavior.

Search results must be preserved at the publication/version level. Family grouping aids navigation; it does not make all family members identical evidence.

## Technology sources

| ID | Source | Use |
|---|---|---|
| T01 | [Next.js releases](https://nextjs.org/blog) | Current stable framework family and release context |
| T02 | [React versions](https://react.dev/versions) | Current React family |
| T03 | [Tailwind releases](https://tailwindcss.com/blog) | Current CSS framework family |
| T04 | [Node.js release schedule](https://nodejs.org/en/about/previous-releases) | Node 24 LTS target rather than the Current release |
| T05 | [Better Auth documentation](https://better-auth.com/docs/introduction) | Identity integration |
| T06 | [Drizzle overview](https://orm.drizzle.team/docs/overview) | ORM and migration approach |
| T07 | [AI SDK documentation](https://ai-sdk.dev/docs/introduction) | Model integration, checked against installed package docs |
| T08 | [Workflow documentation index](https://workflow-sdk.dev/llms.txt) | Documentation discovery, checked against the pinned installed major |

Exact npm versions, engines and peer declarations are preserved in STACK_BASELINE.json with package registry links. Those registry values were retrieved for this architecture; they are not evidence that the complete application dependency graph has been installed and built.

The AI SDK 7.0.97 and Workflow 4.8.8 packages were inspected in a temporary documentation environment to check current API families. This was documentation/API verification, not a tested production integration. Public Workflow documentation may expose a newer major; use the installed version's bundled documentation.

Recommended integration choices without an exact version in the baseline—S3/KMS, ECS, Stripe, PostHog, Tiptap, test tools and infrastructure tooling—are architecture decisions. Cursor must verify current official setup, region support, commercial terms, stable versions and peer compatibility before implementation.

## Production rule-source record

Implement at least these fields for each promoted source:

| Field | Purpose |
|---|---|
| canonical URL and authority ID | Reproducible source identity |
| authority type and jurisdiction | Correct legal hierarchy |
| official publication/effective dates | Temporal applicability |
| retrieved_at and content SHA-256 | Evidence of the consulted version |
| supersedes/superseded_by | Prevent stale rules from resurfacing |
| source locator and short supported proposition | Traceability |
| subsequent-treatment status | Visible limits on case reliance |
| reviewer and review date | Actual accountable promotion |
| rule-pack version and affected evaluators | Change impact |
| next review trigger | Controlled refresh |

An ingestion job may detect a difference and propose a rule update. It cannot silently promote a changed legal standard into production.

## Explicitly unverified matters

This handoff does not establish novelty of the hypothetical spending-authority example, patent income probabilities, an attorney-equivalence benchmark result, rights to a specific commercial search corpus, any customer's provider agreement, an existing practitioner engagement, or a completed application build. Those facts require their respective evidence.

