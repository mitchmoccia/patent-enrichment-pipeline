"use server";

import {
  AppError,
  type AuthorizedContext,
  assertMfaEnrolled,
  saveFigure,
  saveSection,
  saveTerm,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/specification`;
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

export async function saveSectionAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await saveSection(db(), ctx, {
      matterId,
      kind: String(formData.get("kind") ?? ""),
      text: String(formData.get("text") ?? ""),
      hypothetical: formData.get("hypothetical") === "on",
      evidenceNote: String(formData.get("evidenceNote") ?? "") || null,
    });
    return saved.hypothetical
      ? `Section saved at revision ${saved.revision}. The example stays hypothetical.`
      : `Section saved at revision ${saved.revision}.`;
  });
}

export async function saveFigureAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await saveFigure(db(), ctx, {
      matterId,
      numeral: String(formData.get("numeral") ?? ""),
      label: String(formData.get("label") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
    return "Figure recorded.";
  });
}

export async function saveTermAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await saveTerm(db(), ctx, {
      matterId,
      term: String(formData.get("term") ?? ""),
      definition: String(formData.get("definition") ?? ""),
    });
    return "Term recorded.";
  });
}
