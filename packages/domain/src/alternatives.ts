import { RuleError } from "./rules";

export interface AlternativeInput {
  origin: "person" | "model";
  removesBenefit: string | null;
  explanation: string | null;
  partitionTolerant: boolean;
  consistencyAssumption: string | null;
}

export function rankAlternative(input: AlternativeInput): {
  rank: "not_equivalent" | "candidate";
  reason: string;
} {
  if (input.partitionTolerant && !input.consistencyAssumption?.trim()) {
    throw new RuleError("a partition-tolerant alternative must state its consistency assumption");
  }
  if (input.removesBenefit?.trim() && !input.explanation?.trim()) {
    return {
      rank: "not_equivalent",
      reason: "removed an essential benefit without an explanation",
    };
  }
  return {
    rank: "candidate",
    reason: input.explanation?.trim() || "no essential benefit was removed",
  };
}

/** A model proposal never enters the selected disclosure on its own. */
export function entersSelectedDisclosure(
  origin: "person" | "model",
  humanSelected: boolean,
): boolean {
  return origin === "person" && humanSelected;
}

export function experimentExecution(configured: boolean): {
  status: "unavailable";
  detail: string;
} {
  return configured
    ? {
        status: "unavailable",
        detail: "A sandbox endpoint is set, but execution is not enabled in this build.",
      }
    : {
        status: "unavailable",
        detail: "No experiment sandbox is configured. The plan stays text.",
      };
}
