"use server";

import {
  AppError,
  type AuthorizedContext,
  approveWatchPlan,
  assertMfaEnrolled,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/operations`;
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

export async function approveWatchAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const plan = await approveWatchPlan(db(), ctx, {
      matterId,
      source: String(formData.get("source") ?? ""),
      cadence: String(formData.get("cadence") ?? ""),
      budgetMicrousd: String(formData.get("budgetMicrousd") ?? ""),
      approved: formData.get("approved") === "on",
    });
    return `Watch approved for ${plan.source}. No demand letter is sent.`;
  });
}
