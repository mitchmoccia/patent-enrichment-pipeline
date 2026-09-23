"use server";

import {
  AppError,
  type AuthorizedContext,
  assertMfaEnrolled,
  proposeAlternative,
  selectAlternative,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/alternatives`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

async function act(
  matterId: string,
  work: (ctx: AuthorizedContext) => Promise<string>,
): Promise<void> {
  const ctx = await requireContext();
  assertMfaEnrolled(await sessionHasMfa());
  try {
    redirect(pathFor(matterId, await work(ctx)));
  } catch (error) {
    if (error instanceof AppError) redirect(pathFor(matterId, error.message));
    throw error;
  }
}

export async function proposeAlternativeAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await proposeAlternative(db(), ctx, {
      matterId,
      label: String(formData.get("label") ?? ""),
      origin: String(formData.get("origin") ?? "") === "model" ? "model" : "person",
      removesBenefit: String(formData.get("removesBenefit") ?? "") || null,
      explanation: String(formData.get("explanation") ?? "") || null,
      partitionTolerant: formData.get("partitionTolerant") === "on",
      consistencyAssumption: String(formData.get("consistencyAssumption") ?? "") || null,
      feasibility: "unknown",
    });
    return `${saved.rank}: ${saved.rankReason}. Experiment execution is ${saved.experimentStatus}.`;
  });
}

export async function selectAlternativeAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await selectAlternative(db(), ctx, {
      matterId,
      alternativeId: String(formData.get("alternativeId") ?? ""),
    });
    return "Person-authored alternative added to the selected disclosure.";
  });
}
