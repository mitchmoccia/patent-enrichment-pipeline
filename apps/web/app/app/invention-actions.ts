"use server";

import {
  AppError,
  type AuthorizedContext,
  acceptMechanismSuggestion,
  answerInventionQuestion,
  assertMfaEnrolled,
  extractInvention,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function inventionPath(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/invention`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

async function act(
  matterId: string,
  work: (ctx: AuthorizedContext) => Promise<string>,
): Promise<void> {
  const ctx = await requireContext();
  assertMfaEnrolled(await sessionHasMfa());
  try {
    redirect(inventionPath(matterId, await work(ctx)));
  } catch (error) {
    if (error instanceof AppError) redirect(inventionPath(matterId, error.message));
    throw error;
  }
}

export async function extractInventionAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const result = await extractInvention(db(), ctx, matterId, {
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
      AI_INTAKE_MODEL: process.env.AI_INTAKE_MODEL,
    });
    return result.status === "provider_unavailable"
      ? "No model route is configured. No mechanism text was invented."
      : "Intake recorded exact quotes and proposals separately.";
  });
}

export async function answerQuestionAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await answerInventionQuestion(db(), ctx, {
      matterId,
      questionId: String(formData.get("questionId") ?? ""),
      text: String(formData.get("answer") ?? ""),
      expectedRevision: Number(formData.get("expectedRevision") ?? "0"),
    });
    return `Answer recorded at revision ${saved.revision}. Earlier analysis is stale.`;
  });
}

export async function acceptSuggestionAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await acceptMechanismSuggestion(db(), ctx, {
      matterId,
      suggestionId: String(formData.get("suggestionId") ?? ""),
      expectedRevision: Number(formData.get("expectedRevision") ?? "0"),
    });
    return `Suggestion accepted at ${saved.acceptedAt}. Invention date and inventorship were not set.`;
  });
}
