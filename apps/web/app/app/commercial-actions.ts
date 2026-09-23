"use server";

import {
  AppError,
  type AuthorizedContext,
  assertMfaEnrolled,
  recordCommercial,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/commercial`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

function blank(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
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

export async function recordCommercialAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await recordCommercial(db(), ctx, {
      matterId,
      buyer: blank(formData.get("buyer")),
      substitute: blank(formData.get("substitute")),
      evidenceRequest: blank(formData.get("evidenceRequest")),
      strategy: String(formData.get("strategy") ?? ""),
      decision: String(formData.get("decision") ?? ""),
      productRevenueMicrousd: blank(formData.get("productRevenueMicrousd")),
      productCostMicrousd: blank(formData.get("productCostMicrousd")),
      patentCostMicrousd: blank(formData.get("patentCostMicrousd")),
      marketSizeMicrousd: blank(formData.get("marketSizeMicrousd")),
      licensingProbability: blank(formData.get("licensingProbability")),
    });
    return `Recorded ${saved.decision}. Product cashflow is ${saved.productCashflowMicrousd ?? "unknown"}. Patent value stays unknown.`;
  });
}
