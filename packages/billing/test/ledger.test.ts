import { describe, expect, it } from "vitest";
import { exposureOf, markUnknown, planReserve } from "../src/index.js";

const cap = "100";

describe("budget ledger", () => {
  it("does not create a second reservation for the same operation", () => {
    const first = planReserve([], {
      operationId: "op-1",
      amountMicrousd: "40",
      requestHash: "h1",
      capMicrousd: cap,
    });
    const second = planReserve([first.reservation], {
      operationId: "op-1",
      amountMicrousd: "40",
      requestHash: "h1",
      capMicrousd: cap,
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(exposureOf([first.reservation]).knownMicrousd).toBe(40n);
  });

  it("conflicts when the same operation id is reused with a different request", () => {
    const first = planReserve([], {
      operationId: "op-1",
      amountMicrousd: "40",
      requestHash: "h1",
      capMicrousd: cap,
    });
    expect(() =>
      planReserve([first.reservation], {
        operationId: "op-1",
        amountMicrousd: "40",
        requestHash: "h2",
        capMicrousd: cap,
      }),
    ).toThrowError(/different request/);
  });

  it("refuses a reservation that would exceed the cap", () => {
    const first = planReserve([], {
      operationId: "op-1",
      amountMicrousd: "60",
      requestHash: "a",
      capMicrousd: cap,
    });
    expect(() =>
      planReserve([first.reservation], {
        operationId: "op-2",
        amountMicrousd: "50",
        requestHash: "b",
        capMicrousd: cap,
      }),
    ).toThrowError(/exceed the cap/);
  });

  it("keeps an unknown provider cost visible and blocks further spend when the amount is unknown", () => {
    const first = planReserve([], {
      operationId: "op-1",
      amountMicrousd: "30",
      requestHash: "a",
      capMicrousd: cap,
    });
    const unknown = markUnknown(first.reservation, false);
    expect(unknown.status).toBe("unknown");
    expect(unknown.known).toBe(false);
    expect(exposureOf([unknown]).unknownAmountOperationIds).toEqual(["op-1"]);
    expect(() =>
      planReserve([unknown], {
        operationId: "op-2",
        amountMicrousd: "1",
        requestHash: "b",
        capMicrousd: cap,
      }),
    ).toThrowError(/unknown provider cost/);
  });

  it("counts a timeout reservation that still has its quoted amount", () => {
    const first = planReserve([], {
      operationId: "op-1",
      amountMicrousd: "30",
      requestHash: "a",
      capMicrousd: cap,
    });
    const unknown = markUnknown(first.reservation, true);
    expect(exposureOf([unknown]).knownMicrousd).toBe(30n);
    expect(unknown.status).toBe("unknown");
  });
});
