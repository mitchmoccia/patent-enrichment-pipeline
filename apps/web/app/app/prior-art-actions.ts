"use server";

import {
  AppError,
  type AuthorizedContext,
  addLimitation,
  assertMfaEnrolled,
  recordEligibility,
  recordFinding,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/prior-art`;
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

export async function addLimitationAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await addLimitation(db(), ctx, { matterId, text: String(formData.get("text") ?? "") });
    return "Limitation recorded.";
  });
}

export async function recordFindingAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await recordFinding(db(), ctx, {
      matterId,
      limitationId: String(formData.get("limitationId") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      referenceIds: formData.getAll("referenceId").map(String).filter(Boolean),
      quote: String(formData.get("quote") ?? ""),
      motivation: String(formData.get("motivation") ?? "") || null,
    });
    return saved.legalStatus === "supported"
      ? "Finding supported by the cited passage and date."
      : `Finding rejected: ${saved.reason}. Relevance stays ${saved.relevance}.`;
  });
}

export async function recordEligibilityAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await recordEligibility(db(), ctx, {
      matterId,
      limitationId: String(formData.get("limitationId") ?? ""),
      answer: String(formData.get("answer") ?? ""),
    });
    return saved.legalStatus === "supported"
      ? "Eligibility answer cites the limitation."
      : "Eligibility answer rejected as a generic fix.";
  });
}
