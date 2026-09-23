"use server";

import {
  AppError,
  type AuthorizedContext,
  addIdsCandidate,
  assertMfaEnrolled,
  confirmDeadline,
  confirmFiled,
  importOfficeAction,
  importReceipt,
  proposeDeadline,
  saveResponse,
} from "@patent/application";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireContext, sessionHasMfa } from "@/session";

function pathFor(matterId: string, notice?: string): string {
  const base = `/app/matters/${matterId}/filing`;
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

export async function importReceiptAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await importReceipt(db(), ctx, {
      matterId,
      applicationNumber: blank(formData.get("applicationNumber")),
      releasedDigest: String(formData.get("releasedDigest") ?? ""),
      submittedDigest: String(formData.get("submittedDigest") ?? ""),
    });
    return `Receipt ${saved.receipt.reconciliation}. Matter state remains ${saved.matterState}.`;
  });
}

export async function confirmFiledAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const matter = await confirmFiled(db(), ctx, {
      matterId,
      requested: "filed",
      viaDownload: false,
      viaCheckbox: false,
    });
    return `Recorded ${matter.state} from a matched receipt.`;
  });
}

export async function importOfficeActionAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const saved = await importOfficeAction(db(), ctx, {
      matterId,
      sourceText: String(formData.get("sourceText") ?? ""),
    });
    return `Office action stored. Matter state remains ${saved.matterState}.`;
  });
}

export async function proposeDeadlineAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const row = await proposeDeadline(db(), ctx, {
      matterId,
      source: String(formData.get("source") ?? ""),
      ruleContext: String(formData.get("ruleContext") ?? ""),
      proposedDue: String(formData.get("proposedDue") ?? ""),
    });
    return `Proposed ${row.proposedDue} from ${row.source}.`;
  });
}

export async function confirmDeadlineAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const row = await confirmDeadline(db(), ctx, {
      matterId,
      deadlineId: String(formData.get("deadlineId") ?? ""),
    });
    return `Confirmed ${row.proposedDue} under ${row.ruleContext}.`;
  });
}

export async function saveResponseAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    await saveResponse(db(), ctx, {
      matterId,
      text: String(formData.get("text") ?? ""),
      supportNote: blank(formData.get("supportNote")),
      newlyInvented: formData.get("newlyInvented") === "on",
    });
    return "Response draft stored with its support note.";
  });
}

export async function addIdsAction(formData: FormData): Promise<void> {
  const matterId = String(formData.get("matterId") ?? "");
  await act(matterId, async (ctx) => {
    const row = await addIdsCandidate(db(), ctx, {
      matterId,
      label: String(formData.get("label") ?? ""),
    });
    return `${row.label} is a candidate. It was not submitted.`;
  });
}
