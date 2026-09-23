import { type Database, schema, withTenant } from "@patent/db";
import {
  assertSelfFilerRelease,
  assessCommercial,
  assessEligibility,
  assessFinding,
  citationConsensus,
  dependencyCycle,
  displayedOutcome,
  entersSelectedDisclosure,
} from "@patent/domain";
import { disclosureDate } from "@patent/research";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

export interface BenchmarkCheck {
  id: string;
  caught: boolean;
}

export interface BenchmarkReport {
  checks: BenchmarkCheck[];
  practitioners: 0;
  statisticalSufficiency: false;
  certifiesPatentability: false;
  deploymentUrl: null;
  limitations: string[];
}

const limitations = [
  "Two practitioners did not independently annotate these cases.",
  "The protocol's proposed sample sizes are not statistical sufficiency.",
  "No hidden evaluation set was run.",
  "This report does not certify patentability, enforceability, or attorney-level quality.",
  "PDF page rendering and a zipped DOCX are unavailable.",
  "Official filing stays manual. No deployment URL is published.",
];

function caught(id: string, ok: boolean): BenchmarkCheck {
  return { id, caught: ok };
}

export function practitionerBenchmark(): BenchmarkReport {
  const fabricated = assessFinding({
    kind: "anticipation",
    quotes: [
      {
        quote: "Root authority ledger",
        sourceText: "The worker records a timeout.",
        fullTextStatus: "available",
        disclosureDate: "2020-01-01",
      },
    ],
    criticalDate: "2024-01-01",
    motivation: null,
  });
  const wrongDate = assessFinding({
    kind: "anticipation",
    quotes: [
      {
        quote: "records a timeout",
        sourceText: "The worker records a timeout.",
        fullTextStatus: "available",
        disclosureDate: "2025-01-01",
      },
    ],
    criticalDate: "2024-01-01",
    motivation: null,
  });
  const snippet = assessFinding({
    kind: "anticipation",
    quotes: [
      {
        quote: "records a timeout",
        sourceText: "The worker records a timeout.",
        fullTextStatus: "unavailable",
        disclosureDate: "2020-01-01",
      },
    ],
    criticalDate: "2024-01-01",
    motivation: null,
  });
  const eligibility = assessEligibility("add a processor", ["records a timeout"]);
  let entityBlocked = false;
  try {
    assertSelfFilerRelease("entity_applicant");
  } catch {
    entityBlocked = true;
  }
  let licensingBlocked = false;
  try {
    assessCommercial({
      buyer: null,
      substitute: null,
      evidenceRequest: null,
      strategy: "licensing_or_sale",
      decision: "stop",
      productRevenueMicrousd: null,
      productCostMicrousd: null,
      patentCostMicrousd: null,
      marketSizeMicrousd: null,
      licensingProbability: "0.8",
    });
  } catch {
    licensingBlocked = true;
  }
  const checks = [
    caught("fabricated_citation", fabricated.reason === "fabricated_citation"),
    caught("wrong_date", wrongDate.reason === "wrong_date"),
    caught("snippet_only", snippet.reason === "snippet_only"),
    caught("generic_eligibility", eligibility.reason === "generic_eligibility_fix"),
    caught(
      "dependency_cycle",
      dependencyCycle([
        { id: "a", dependsOn: "b" },
        { id: "b", dependsOn: "a" },
      ]),
    ),
    caught("model_disclosure", entersSelectedDisclosure("model", true) === false),
    caught(
      "model_consensus",
      citationConsensus("Root authority ledger", "The worker records a timeout.", 3).reason ===
        "fabricated_citation",
    ),
    caught("entity_self_filer", entityBlocked),
    caught(
      "family_date",
      disclosureDate({ publicationDate: null, familyDate: "2019-01-01" }) === null,
    ),
    caught(
      "stale_release",
      displayedOutcome({ outcome: "pass", dependencyDigest: "old" }, "new") === "stale",
    ),
    caught("licensing_probability", licensingBlocked),
  ];
  return {
    checks,
    practitioners: 0,
    statisticalSufficiency: false,
    certifiesPatentability: false,
    deploymentUrl: null,
    limitations,
  };
}

export async function recordBenchmark(db: Database, ctx: AuthorizedContext, matterId: string) {
  assertHumanActor(ctx);
  const report = practitionerBenchmark();
  if (report.checks.some((check) => !check.caught)) {
    throw new AppError("POLICY_BLOCKED", "a known defect was not caught");
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, matterId);
    await requireEditor(tx, matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.benchmarkReports)
      .values({
        tenantId: ctx.tenantId,
        matterId,
        report,
        certified: false,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "benchmark was not recorded");
    return row;
  });
}

export async function getBenchmark(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const [latest] = await tx
      .select()
      .from(schema.benchmarkReports)
      .where(eq(schema.benchmarkReports.matterId, matterId))
      .orderBy(desc(schema.benchmarkReports.createdAt))
      .limit(1);
    return { report: latest?.report ?? practitionerBenchmark(), stored: Boolean(latest) };
  });
}
