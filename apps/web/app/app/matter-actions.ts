"use server";
import {
  assertMfaEnrolled,
  recordProcessingPolicy,
  serverActionRevokeMember,
  serverActionUpdateGoal,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function matterPath(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

export async function updateGoalAction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const matterId = String(formData.get("matterId") ?? "");
  const result = await serverActionUpdateGoal(db(), ctx, {
    matterId,
    goal: String(formData.get("goal") ?? ""),
    expectedRevision: Number(formData.get("expectedRevision") ?? "0"),
    mfaEnabled: await sessionHasMfa(),
  });
  redirect(matterPath(matterId, `Goal saved at revision ${result.revision}`));
}

export async function revokeMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  const matterId = String(formData.get("matterId") ?? "");
  await serverActionRevokeMember(db(), ctx, {
    matterId,
    principalId: String(formData.get("principalId") ?? "").trim(),
    mfaEnabled: await sessionHasMfa(),
  });
  redirect(matterPath(matterId, "Access revoked"));
}

export async function recordPolicyAction(formData: FormData): Promise<void> {
  const ctx = await requireContext();
  assertMfaEnrolled(await sessionHasMfa());
  const matterId = String(formData.get("matterId") ?? "");
  const regions = String(formData.get("allowedRegions") ?? "us")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const saved = await recordProcessingPolicy(
    db(),
    ctx,
    matterId,
    {
      allowedRegions: regions.length > 0 ? regions : ["us"],
      confidentialEgressAllowed: formData.get("confidentialEgressAllowed") === "yes",
      retentionPolicyId: "matter-default",
      budgetCapMicrousd: String(formData.get("budgetCapMicrousd") ?? "").trim(),
    },
    Number(formData.get("expectedRevision") ?? "0"),
  );
  redirect(matterPath(matterId, `Policy recorded at revision ${saved.revision}`));
}
