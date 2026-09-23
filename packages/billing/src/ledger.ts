export type ReservationStatus = "reserved" | "committed" | "unknown" | "released" | "reconciled";

export interface Reservation {
  operationId: string;
  status: ReservationStatus;
  /** Null when the provider never reported a cost. */
  amountMicrousd: string | null;
  known: boolean;
  requestHash: string;
}

export type BudgetCode = "BUDGET_EXCEEDED" | "EXTERNAL_OUTCOME_UNKNOWN" | "IDEMPOTENCY_CONFLICT";

export class BudgetError extends Error {
  readonly code: BudgetCode;
  constructor(code: BudgetCode, message: string) {
    super(message);
    this.name = "BudgetError";
    this.code = code;
  }
}

const COUNTING: ReadonlySet<ReservationStatus> = new Set([
  "reserved",
  "committed",
  "unknown",
  "reconciled",
]);

export interface Exposure {
  knownMicrousd: bigint;
  unknownAmountOperationIds: string[];
}

/** Reserved, committed, unknown, and reconciled amounts count. Released amounts do not. */
export function exposureOf(rows: readonly Reservation[]): Exposure {
  let knownMicrousd = 0n;
  const unknownAmountOperationIds: string[] = [];
  for (const row of rows) {
    if (!COUNTING.has(row.status)) continue;
    if (!row.known || row.amountMicrousd === null) {
      unknownAmountOperationIds.push(row.operationId);
      continue;
    }
    knownMicrousd += BigInt(row.amountMicrousd);
  }
  return { knownMicrousd, unknownAmountOperationIds };
}

export interface ReservePlan {
  created: boolean;
  reservation: Reservation;
}

/**
 * Plan a reservation. The same operation id and request hash returns the existing
 * row. A different hash conflicts. Unknown amounts block new spend.
 */
export function planReserve(
  rows: readonly Reservation[],
  input: { operationId: string; amountMicrousd: string; requestHash: string; capMicrousd: string },
): ReservePlan {
  const existing = rows.find((row) => row.operationId === input.operationId);
  if (existing) {
    if (existing.requestHash !== input.requestHash) {
      throw new BudgetError(
        "IDEMPOTENCY_CONFLICT",
        "this operation id was already used for a different request",
      );
    }
    return { created: false, reservation: existing };
  }
  if (!/^\d+$/.test(input.amountMicrousd) || !/^\d+$/.test(input.capMicrousd)) {
    throw new BudgetError("BUDGET_EXCEEDED", "amounts must be nonnegative integers");
  }
  const exposure = exposureOf(rows);
  if (exposure.unknownAmountOperationIds.length > 0) {
    throw new BudgetError(
      "EXTERNAL_OUTCOME_UNKNOWN",
      `unknown provider cost on ${exposure.unknownAmountOperationIds.join(", ")} still blocks new spend`,
    );
  }
  const next = exposure.knownMicrousd + BigInt(input.amountMicrousd);
  if (next > BigInt(input.capMicrousd)) {
    throw new BudgetError(
      "BUDGET_EXCEEDED",
      `reservation would exceed the cap of ${input.capMicrousd}`,
    );
  }
  return {
    created: true,
    reservation: {
      operationId: input.operationId,
      status: "reserved",
      amountMicrousd: input.amountMicrousd,
      known: true,
      requestHash: input.requestHash,
    },
  };
}

/** A timeout keeps the reserved amount and marks it unknown so it stays visible. */
export function markUnknown(row: Reservation, knownAmount: boolean): Reservation {
  if (row.status === "released" || row.status === "reconciled") return row;
  return {
    ...row,
    status: "unknown",
    known: knownAmount && row.amountMicrousd !== null,
    amountMicrousd: knownAmount ? row.amountMicrousd : null,
  };
}
