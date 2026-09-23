"use server";

import {
  AppError,
  type AuthorizedContext,
  advanceRun,
  assertMfaEnrolled,
  recordRunDecision,
  resumeRun,
  startRun,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function matterPath(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}`;
  return notice ? `${base}?notice=${encodeURIComponent(notice)}` : base;
}

async function act(
  matterId: string,
  work: (ctx: AuthorizedContext) => Promise<string>,
): Promise<void> {
  const ctx = await requireContext();
  assertMfaEnrolled(await sessionHasMfa());
  try {
    redirect(matterPath(matterId, await work(ctx)));
  } catch (error) {
    if (error instanceof AppError) redirect(matterPath(matterId, error.message));
    throw error;
  }
}

export async function startRunAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const started = await startRun(db(), ctx, {
      matterId,
      idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    });
    return started.replayed ? "Existing run returned" : "Run started";
  });
}

export async function pauseRunAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  await act(matterId, async (ctx) => {
    await recordRunDecision(db(), ctx, runId, "pause");
    return "Run paused";
  });
}

export async function cancelRunAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  await act(matterId, async (ctx) => {
    await recordRunDecision(db(), ctx, runId, "cancel");
    return "Run cancelled. Unused reservations were released. Unknown costs stay listed.";
  });
}

export async function resumeRunAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  await act(matterId, async (ctx) => {
    const decision = await recordRunDecision(db(), ctx, runId, "resume");
    await resumeRun(db(), ctx, { decisionId: decision.decisionId });
    return "Run resumed";
  });
}

export async function advanceRunAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  await act(matterId, async (ctx) => {
    await advanceRun(db(), ctx, runId, {
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    });
    return "Ingest finished. Analysis did not invent text.";
  });
}
