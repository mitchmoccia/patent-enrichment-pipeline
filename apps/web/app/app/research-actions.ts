"use server";

import {
  AppError,
  type AuthorizedContext,
  assertMfaEnrolled,
  importReference,
  searchMatter,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function researchPath(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/research`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

async function act(
  matterId: string,
  work: (ctx: AuthorizedContext) => Promise<string>,
): Promise<void> {
  const ctx = await requireContext();
  assertMfaEnrolled(await sessionHasMfa());
  try {
    redirect(researchPath(matterId, await work(ctx)));
  } catch (error) {
    if (error instanceof AppError) redirect(researchPath(matterId, error.message));
    throw error;
  }
}

export async function importReferenceAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const fullText = String(formData.get("fullText") ?? "").trim();
    await importReference(db(), ctx, {
      matterId,
      title: String(formData.get("title") ?? ""),
      publicationNumber: String(formData.get("publicationNumber") ?? ""),
      publicationDate: String(formData.get("publicationDate") ?? "") || null,
      familyDate: String(formData.get("familyDate") ?? "") || null,
      fullText: fullText || null,
      passage: String(formData.get("passage") ?? "") || null,
    });
    return fullText
      ? "Imported the supplied full text."
      : "Imported the reference. Full text stays unavailable.";
  });
}

export async function searchMatterAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const result = await searchMatter(
      db(),
      ctx,
      { matterId, query: String(formData.get("query") ?? "") },
      {
        USPTO_API_KEY: process.env.USPTO_API_KEY,
        EPO_OPS_KEY: process.env.EPO_OPS_KEY,
      },
    );
    return result.stopReason;
  });
}
