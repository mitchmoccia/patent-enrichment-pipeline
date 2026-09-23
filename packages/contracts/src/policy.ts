/**
 * Processing policy stored on a matter. The model cannot raise the cap or
 * allow training use. `trainingUseAllowed` is fixed false.
 */
import { z } from "zod";

const digits = z.string().regex(/^\d+$/, "amount must be a nonnegative integer");

export const processingPolicySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  allowedProviderRouteIds: z.array(z.string()),
  allowedSourceAdapterIds: z.array(z.string()),
  allowedRegions: z.array(z.string().min(1)).min(1),
  confidentialEgressAllowed: z.boolean(),
  queryDisclosureApprovalId: z.string().min(1).optional(),
  trainingUseAllowed: z.literal(false),
  retentionPolicyId: z.string().min(1),
  dataAgreementRefs: z.array(z.string()),
  budgetCapMicrousd: digits,
  approvalActorId: z.string().min(1),
  approvedAt: z.string().min(1),
});

export type ProcessingPolicy = z.infer<typeof processingPolicySchema>;

/** Fields a person may supply. The server fills actor, time, and id. */
export const processingPolicyDraftSchema = z.object({
  allowedRegions: z.array(z.string().min(1)).min(1),
  confidentialEgressAllowed: z.boolean(),
  retentionPolicyId: z.string().trim().min(1).max(120),
  budgetCapMicrousd: digits,
  allowedProviderRouteIds: z.array(z.string()).default([]),
  allowedSourceAdapterIds: z.array(z.string()).default([]),
});

export type ProcessingPolicyDraft = z.input<typeof processingPolicyDraftSchema>;
