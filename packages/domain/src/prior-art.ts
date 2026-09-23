import { RuleError } from "./rules";

const genericFix =
  /^(use|using|add|adding)\s+(an?\s+)?(processor|computer|ai|artificial intelligence|machine learning)\b/i;

export interface CitedPassage {
  quote: string;
  sourceText: string | null;
  fullTextStatus: "available" | "unavailable";
  disclosureDate: string | null;
}

export interface FindingInput {
  kind: "anticipation" | "obviousness" | "technical_similarity";
  quotes: CitedPassage[];
  criticalDate: string | null;
  motivation: string | null;
  successProbability?: unknown;
}

export interface FindingDecision {
  legalStatus: "supported" | "rejected";
  reason: string | null;
  relevance: "relevant" | "not_assessed";
}

function rejected(reason: string, relevance: FindingDecision["relevance"]): FindingDecision {
  return { legalStatus: "rejected", reason, relevance };
}

/** Legal prior-art status is separate from whether the passage looks relevant. */
export function assessFinding(input: FindingInput): FindingDecision {
  if (input.successProbability !== undefined) {
    throw new RuleError("a success probability is not a finding");
  }
  if (input.quotes.length === 0) return rejected("missing_citation", "not_assessed");
  for (const quote of input.quotes) {
    if (!quote.quote || !quote.sourceText?.includes(quote.quote)) {
      return rejected("fabricated_citation", "not_assessed");
    }
  }
  if (input.kind === "anticipation" && input.quotes.length !== 1) {
    return rejected("distributed_features", "relevant");
  }
  if (input.kind === "anticipation" && input.quotes[0]?.fullTextStatus !== "available") {
    return rejected("snippet_only", "relevant");
  }
  if (input.kind === "obviousness" && input.quotes.length > 1 && !input.motivation?.trim()) {
    return rejected("absent_combination_motivation", "relevant");
  }
  for (const quote of input.quotes) {
    if (!input.criticalDate || !quote.disclosureDate) return rejected("date_unknown", "relevant");
    if (quote.disclosureDate > input.criticalDate) return rejected("wrong_date", "relevant");
  }
  return { legalStatus: "supported", reason: null, relevance: "relevant" };
}

export function assessEligibility(
  answer: string,
  operations: readonly string[],
): { legalStatus: "supported" | "rejected"; reason: string | null } {
  const text = answer.trim();
  const grounded = operations.some((operation) => operation.length > 0 && text.includes(operation));
  if (!text || genericFix.test(text) || !grounded) {
    return { legalStatus: "rejected", reason: "generic_eligibility_fix" };
  }
  return { legalStatus: "supported", reason: null };
}
