import { describe, expect, it } from "vitest";
import { assessCommercial } from "../src/index.js";

const base = {
  buyer: null,
  substitute: "a shared spreadsheet",
  evidenceRequest: "ask the buyer what they pay now",
  strategy: "operating",
  decision: "stop",
  productRevenueMicrousd: null,
  productCostMicrousd: null,
  patentCostMicrousd: "1000000",
  marketSizeMicrousd: null,
  licensingProbability: null,
};

describe("commercial assessment", () => {
  it("leaves missing market data unknown and keeps patent value separate", () => {
    const record = assessCommercial(base);
    expect(record.unknowns).toContain("market_size");
    expect(record.unknowns).toContain("product_cashflow");
    expect(record.incrementalPatentValueMicrousd).toBeNull();
    expect(record.erasesEngineering).toBe(false);
    expect(record.decision).toBe("stop");
  });

  it("computes product cashflow without treating it as patent value", () => {
    const record = assessCommercial({
      ...base,
      decision: "proceed",
      productRevenueMicrousd: "100",
      productCostMicrousd: "40",
    });
    expect(record.productCashflowMicrousd).toBe("60");
    expect(record.incrementalPatentValueMicrousd).toBeNull();
  });

  it("rejects an unsupported licensing probability and an unsourced market size", () => {
    expect(() => assessCommercial({ ...base, licensingProbability: "0.4" })).toThrowError(
      /licensing probability/,
    );
    expect(() => assessCommercial({ ...base, marketSizeMicrousd: "999" })).toThrowError(
      /market size/,
    );
  });
});
