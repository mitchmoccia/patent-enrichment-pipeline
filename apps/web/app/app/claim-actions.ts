"use server";

import {
  AppError,
  type AuthorizedContext,
  assertMfaEnrolled,
  patchClaim,
  saveClaim,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/claims`;
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

export async function saveClaimAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const dependsOn = String(formData.get("dependsOn") ?? "");
    await saveClaim(db(), ctx, {
      matterId,
      category: String(formData.get("category") ?? "") === "system" ? "system" : "method",
      dependsOn: dependsOn || null,
      connective: String(formData.get("connective") ?? "") === "or" ? "or" : "and",
      limitations: [
        {
          text: String(formData.get("limitation") ?? ""),
          actor: String(formData.get("actor") ?? "") || null,
        },
      ],
    });
    return "Claim recorded.";
  });
}

export async function patchClaimAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await patchClaim(db(), ctx, {
      matterId,
      claimId: String(formData.get("claimId") ?? ""),
      expectedRevision: Number(formData.get("expectedRevision") ?? "0"),
      connective: String(formData.get("connective") ?? "") === "or" ? "or" : "and",
    });
    return saved.supportStatus === "stale"
      ? `Claim revision ${saved.revision}. Earlier support is stale.`
      : `Claim revision ${saved.revision}.`;
  });
}
