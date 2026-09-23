import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  acceptModelSuggestion,
  assertModelMay,
  forbiddenModelActions,
  type IntakeSource,
  planIntake,
  runIntake,
  sanitizeModelElements,
  verifyCitation,
} from "../src/index.js";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../../docs/handoff/fixtures/agent-spending-authority.json", import.meta.url),
    "utf8",
  ),
) as {
  input: { idea: string; artifacts: { id: string; text: string; origin: string }[] };
  proposedMechanism: { components: string[] };
};

function fixtureSources(): IntakeSource[] {
  return [
    { id: "idea", role: "idea", text: fixture.input.idea },
    ...fixture.input.artifacts.map((artifact) => ({
      id: artifact.id,
      role: artifact.origin.includes("question") ? ("question" as const) : ("supplied" as const),
      text: artifact.text,
    })),
  ];
}

describe("mechanism intake", () => {
  it("asks the spending fixture about an uncertain payment outcome", () => {
    const plan = planIntake(fixtureSources(), "not_configured");
    expect(plan.status).toBe("provider_unavailable");
    expect(plan.extractedByModel).toBe(false);
    const payment = plan.questions.find(
      (question) => question.affectedFeature === "payment outcome",
    );
    expect(payment?.text).toMatch(/payment/i);
    expect(payment?.text).toMatch(/times out/i);
    expect(payment?.sourceId).toBe("TEST-SOURCE-002");
    for (const component of fixture.proposedMechanism.components) {
      expect(plan.elements.some((element) => element.text.includes(component))).toBe(false);
    }
  });

  it("turns a vague idea into a development task and writes no mechanism", () => {
    const plan = planIntake(
      [{ id: "idea", role: "idea", text: "Improve things" }],
      "not_configured",
    );
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.elements).toEqual([]);
    expect(plan.questions).toEqual([]);
  });

  it("rejects a supplied-fact label on text the model invented", () => {
    const corpus = "Workers can duplicate process state.";
    const result = sanitizeModelElements(
      [
        { text: corpus, classification: "supplied_fact" },
        { text: "Root authority ledger enforces the cap.", classification: "supplied_fact" },
        {
          text: "Retain the reservation until reconciliation.",
          classification: "proposed_embodiment",
        },
      ],
      corpus,
    );
    expect(result.quoted.map((element) => element.text)).toEqual([corpus]);
    expect(result.rejected).toEqual(["Root authority ledger enforces the cap."]);
    expect(result.proposals).toEqual([
      {
        text: "Retain the reservation until reconciliation.",
        classification: "proposed_embodiment",
        proposedByKind: "model",
      },
    ]);
  });

  it("keeps model origin and does not set an invention date or inventorship", () => {
    const accepted = acceptModelSuggestion(
      {
        text: "Retain the reservation until reconciliation.",
        classification: "proposed_embodiment",
        proposedByKind: "model",
      },
      "2026-09-23T22:00:00.000Z",
    );
    expect(accepted.acceptedAt).toBe("2026-09-23T22:00:00.000Z");
    expect(accepted.inventionDate).toBeNull();
    expect(accepted.inventorship).toBe("unresolved");
    expect(accepted.proposedByKind).toBe("model");
    expect(accepted.classification).toBe("proposed_embodiment");
  });

  it("stops a model from approving, permitting, signing, filing, verifying, or raising a cap", () => {
    for (const action of forbiddenModelActions) {
      expect(() => assertModelMay("model", action)).toThrowError(/model cannot/);
    }
    expect(() => verifyCitation("model", "quoted", "quoted")).toThrowError(/verify citation/);
    expect(verifyCitation("person", "quoted", "a quoted source")).toEqual({ verified: true });
    expect(verifyCitation("person", "missing", "a quoted source")).toEqual({ verified: false });
  });

  it("does not keep invented text when the live call fails", async () => {
    const plan = await runIntake(fixtureSources(), {
      apiKey: "present",
      live: async () => {
        throw new Error("gateway down");
      },
    });
    expect(plan.status).toBe("provider_unavailable");
    expect(plan.extractedByModel).toBe(false);
    expect(plan.proposals).toEqual([]);
  });
});
