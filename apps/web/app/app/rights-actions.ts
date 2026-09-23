"use server";

import {
  AppError,
  type AuthorizedContext,
  addChronologyEvent,
  addContribution,
  addEmbodiment,
  assertMfaEnrolled,
  assignFilingDate,
  chooseSelfFiler,
  promoteRule,
  selectCurrentRule,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function rightsPath(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/rights`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

async function act(
  matterId: string,
  work: (ctx: AuthorizedContext) => Promise<string>,
): Promise<void> {
  const ctx = await requireContext();
  assertMfaEnrolled(await sessionHasMfa());
  try {
    redirect(rightsPath(matterId, await work(ctx)));
  } catch (error) {
    if (error instanceof AppError) redirect(rightsPath(matterId, error.message));
    throw error;
  }
}

export async function addContributionAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const row = await addContribution(db(), ctx, {
      matterId,
      role: String(formData.get("role") ?? ""),
      personLabel: String(formData.get("personLabel") ?? ""),
      account: String(formData.get("account") ?? ""),
    });
    return `Recorded ${row.role}. Legal inventorship stays unresolved.`;
  });
}

export async function addChronologyAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await addChronologyEvent(db(), ctx, {
      matterId,
      kind: String(formData.get("kind") ?? ""),
      precision: String(formData.get("precision") ?? ""),
      eventDate: String(formData.get("eventDate") ?? ""),
      note: String(formData.get("note") ?? ""),
    });
    return `Chronology recorded at revision ${saved.revision}.`;
  });
}

export async function addEmbodimentAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await addEmbodiment(db(), ctx, {
      matterId,
      label: String(formData.get("label") ?? ""),
      developedOn: String(formData.get("developedOn") ?? ""),
    });
    return "Embodiment recorded. No filing date was copied onto it.";
  });
}

export async function assignFilingAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await assignFilingDate(db(), ctx, {
      matterId,
      embodimentId: String(formData.get("embodimentId") ?? ""),
      filingOn: String(formData.get("filingOn") ?? ""),
    });
    return `Filing date ${saved.filingOn} covers that embodiment.`;
  });
}

export async function selectRuleAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await selectCurrentRule(db(), ctx, {
      matterId,
      sourceKey: String(formData.get("sourceKey") ?? ""),
    });
    return `Rule selected. ${saved.alert}. Counsel has not approved it.`;
  });
}

export async function promoteRuleAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await promoteRule(db(), ctx, {
      matterId,
      sourceKey: String(formData.get("sourceKey") ?? ""),
    });
    return `Reviewer promotion recorded (${saved.reviewStatus}). Counsel has not approved this source, and it is unsigned.`;
  });
}

export async function chooseSelfFilerAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await chooseSelfFiler(db(), ctx, matterId);
    return `Release label recorded as ${saved.label}.`;
  });
}
