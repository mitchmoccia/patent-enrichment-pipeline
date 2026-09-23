import { describe, expect, it } from "vitest";
import { planReserve } from "../src/index.js";
import {
  approveWatch,
  classifyWebhook,
  incurredAfterCancel,
  quotedAmount,
  redactAnalytics,
  settleCancel,
  stripeEntitlements,
} from "../src/operations.js";

describe("billing operations", () => {
  it("leaves Stripe unavailable and does not grant a duplicate event", () => {
    expect(stripeEntitlements({ secret: false, webhook: false }).entitlements).toBeNull();
    expect(
      classifyWebhook({
        secretConfigured: false,
        eventId: "evt_1",
        signature: "sig",
        seen: [],
      }).reason,
    ).toBe("stripe_unavailable");
    expect(
      classifyWebhook({
        secretConfigured: true,
        eventId: "evt_1",
        signature: "sig",
        seen: ["evt_1"],
      }),
    ).toEqual({ effect: "none", reason: "duplicate" });
  });

  it("keeps the quoted price and the incurred cost after cancel", () => {
    const reserved = planReserve([], {
      operationId: "op-1",
      amountMicrousd: "30",
      requestHash: "h",
      capMicrousd: "100",
    }).reservation;
    const committed = { ...reserved, operationId: "op-2", status: "committed" as const };
    expect(quotedAmount(reserved, "99")).toBe("30");
    expect(
      settleCancel([reserved, committed]).find((row) => row.operationId === "op-1")?.status,
    ).toBe("released");
    expect(incurredAfterCancel([reserved, committed]).knownMicrousd).toBe(30n);
    const first = planReserve([], {
      operationId: "a",
      amountMicrousd: "60",
      requestHash: "a",
      capMicrousd: "100",
    });
    expect(() =>
      planReserve([first.reservation], {
        operationId: "b",
        amountMicrousd: "50",
        requestHash: "b",
        capMicrousd: "100",
      }),
    ).toThrowError(/cap/);
  });

  it("rejects confidential analytics and an unapproved watch", () => {
    expect(() => redactAnalytics({ idea: "secret invention" })).toThrowError(/confidential/);
    expect(redactAnalytics({ provider: "none" })).toEqual({ provider: "none" });
    expect(() =>
      approveWatch({ source: "uspto", cadence: "weekly", budgetMicrousd: "10", approved: false }),
    ).toThrowError(/approval/);
    expect(
      approveWatch({ source: "uspto", cadence: "weekly", budgetMicrousd: "10", approved: true })
        .demandLetters,
    ).toBe(false);
  });
});
