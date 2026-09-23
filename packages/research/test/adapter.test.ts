import { describe, expect, it } from "vitest";
import {
  adapterHealth,
  classifyProviderOutcome,
  disclosureDate,
  passageOf,
  rankImports,
} from "../src/index.js";

describe("research adapters", () => {
  it("does not turn a rejected key into zero matches", () => {
    const rejected = classifyProviderOutcome({ httpStatus: 401, bodyMatchCount: 0 });
    expect(rejected).toEqual({ status: "credentials_rejected", matchCount: null });
    const health = adapterHealth({ USPTO_API_KEY: "expired", EPO_OPS_KEY: "" });
    expect(health.find((item) => item.id === "uspto")).toMatchObject({
      status: "endpoint_unverified",
      matchCount: null,
    });
    expect(health.find((item) => item.id === "epo_ops")?.status).toBe("not_configured");
  });

  it("keeps missing full text unavailable and ignores a family date", () => {
    expect(passageOf({ fullText: null, fullTextStatus: "unavailable" })).toEqual({
      text: null,
      status: "full_text_unavailable",
    });
    expect(disclosureDate({ publicationDate: "2010-04-01", familyDate: "2001-01-01" })).toBe(
      "2010-04-01",
    );
    expect(disclosureDate({ publicationDate: null, familyDate: "2001-01-01" })).toBeNull();
  });

  it("ranks an imported passage above an unrelated title", () => {
    const ranked = rankImports("payment timeout worker", [
      { title: "Unrelated chair", passage: "A chair leg." },
      { title: "Worker payment", passage: "The worker records a timeout." },
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe("Worker payment");
  });
});
