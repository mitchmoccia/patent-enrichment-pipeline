"use server";

import {
  AppError,
  type AuthorizedContext,
  approveGate,
  assertMfaEnrolled,
  evaluateGates,
  releasePackage,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/review`;
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

export async function evaluateGatesAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await evaluateGates(db(), ctx, matterId);
    return "Deterministic checks recorded. A pass still needs a person.";
  });
}

export async function approveGateAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await approveGate(db(), ctx, {
      matterId,
      gateId: String(formData.get("gateId") ?? ""),
    });
    return `${saved.gateId} approved for this digest.`;
  });
}

export async function releasePackageAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await releasePackage(db(), ctx, {
      matterId,
      requestedCapacity: String(formData.get("capacity") ?? ""),
      recordedCapacity: String(formData.get("capacity") ?? ""),
    });
    return `Released digest ${saved.packageDigest.slice(0, 12)}. A later edit needs a new release.`;
  });
}
