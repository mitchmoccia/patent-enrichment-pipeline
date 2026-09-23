import { exposureOf, type Reservation } from "./ledger";

export function stripeEntitlements(configured: { secret: boolean; webhook: boolean }) {
  if (!configured.secret || !configured.webhook) {
    return { status: "unavailable" as const, entitlements: null };
  }
  return { status: "configured_unverified" as const, entitlements: null };
}

export function classifyWebhook(input: {
  secretConfigured: boolean;
  eventId: string;
  signature: string | null;
  seen: readonly string[];
}) {
  if (!input.secretConfigured) return { effect: "none" as const, reason: "stripe_unavailable" };
  if (!input.signature?.trim()) return { effect: "none" as const, reason: "missing_signature" };
  if (input.seen.includes(input.eventId)) return { effect: "none" as const, reason: "duplicate" };
  return { effect: "none" as const, reason: "signature_unverified" };
}

export function quotedAmount(reservation: Reservation, _catalogPrice: string): string | null {
  return reservation.amountMicrousd;
}

export function settleCancel(rows: readonly Reservation[]): Reservation[] {
  return rows.map((row) => (row.status === "reserved" ? { ...row, status: "released" } : row));
}

const analyticsKeys = new Set(["matter_state", "gate_id", "provider"]);

export function redactAnalytics(properties: Record<string, string>): Record<string, string> {
  for (const key of Object.keys(properties)) {
    if (!analyticsKeys.has(key)) {
      throw new Error("analytics cannot carry confidential content");
    }
  }
  return properties;
}

export function approveWatch(input: {
  source: string;
  cadence: string;
  budgetMicrousd: string;
  approved: boolean;
}) {
  if (!input.approved) throw new Error("a watch plan needs explicit approval");
  if (!input.source.trim() || !input.cadence.trim() || !/^\d+$/.test(input.budgetMicrousd)) {
    throw new Error("a watch plan needs a source, cadence, and budget");
  }
  return {
    source: input.source.trim(),
    cadence: input.cadence.trim(),
    budgetMicrousd: input.budgetMicrousd,
    approved: true as const,
    demandLetters: false as const,
  };
}

export function providerHealth(name: string, configured: boolean) {
  return {
    name,
    status: configured ? ("configured_unverified" as const) : ("unconfigured" as const),
  };
}

export function incurredAfterCancel(rows: readonly Reservation[]) {
  return exposureOf(settleCancel(rows));
}
