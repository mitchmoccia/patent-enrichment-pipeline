"use server";
import { randomUUID } from "node:crypto";
import { createMatter } from "@patent/application";
import type { ProcessingPolicy } from "@patent/contracts";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext } from "@/session";

const MODES = [
  "private_development",
  "individual_self_filer",
  "practitioner_supervised",
  "entity_applicant",
] as const;
type Mode = (typeof MODES)[number];

export async function createMatterAction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const rawMode = String(formData.get("applicantMode") ?? "private_development");
  const applicantMode: Mode = (MODES as readonly string[]).includes(rawMode)
    ? (rawMode as Mode)
    : "private_development";

  const budgetRaw = String(formData.get("runBudgetMicrousd") ?? "").trim();
  const recordPolicy = formData.get("recordPolicy") === "yes";
  const regions = String(formData.get("allowedRegions") ?? "us")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const budget = budgetRaw.length > 0 ? budgetRaw : "25000000";
  const processingPolicy: ProcessingPolicy | undefined = recordPolicy
    ? {
        id: randomUUID(),
        version: "1",
        allowedProviderRouteIds: [],
        allowedSourceAdapterIds: [],
        allowedRegions: regions.length > 0 ? regions : ["us"],
        confidentialEgressAllowed: formData.get("confidentialEgressAllowed") === "yes",
        trainingUseAllowed: false,
        retentionPolicyId: "matter-default",
        dataAgreementRefs: [],
        budgetCapMicrousd: budget,
        approvalActorId: ctx.userId,
        approvedAt: new Date().toISOString(),
      }
    : undefined;

  const { id } = await createMatter(db(), ctx, {
    title: String(formData.get("title") ?? "").trim(),
    idea: String(formData.get("idea") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim() || undefined,
    applicantMode,
    runBudgetMicrousd: budgetRaw || undefined,
    processingPolicy,
  });
  redirect(`/app/matters/${id}`);
}
