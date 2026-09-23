import { RuleError } from "./rules";

const promptLeak = /ignore previous|system prompt|you are an ai|hidden prompt/i;
const legalAnalysis =
  /\b(obviousness|anticipation|subject-matter eligibility|success probability)\b/i;

const cleanKinds = new Set(["abstract", "description", "claims"]);

export function assertCleanSection(kind: string, text: string): void {
  if (cleanKinds.has(kind) && (promptLeak.test(text) || legalAnalysis.test(text))) {
    throw new RuleError("clean sections cannot contain prompt text or legal analysis");
  }
}

export function assertNumericalClaim(kind: string, text: string, evidence: string | null): void {
  if (kind === "claims" && /\d/.test(text) && !evidence?.trim()) {
    throw new RuleError("a numerical claim needs experiment evidence");
  }
}

/** Example language stays hypothetical even if the form asked for a real example. */
export function hypotheticalStatus(text: string, requested: boolean): boolean {
  if (/hypothetical|for example/i.test(text)) return true;
  return requested;
}

export function figureDisagreement(
  text: string,
  figures: readonly { numeral: string; label: string }[],
): string | null {
  for (const match of text.matchAll(/figure\s+(\d+)/gi)) {
    const numeral = match[1] ?? "";
    const figure = figures.find((item) => item.numeral === numeral);
    if (!figure) return `Figure ${numeral} is not in the figure list`;
    const sentence = text.match(new RegExp(`figure\\s+${numeral}\\b[^\\n.]*`, "i"))?.[0] ?? "";
    if (figure.label && !sentence.toLowerCase().includes(figure.label.toLowerCase())) {
      return `Figure ${numeral} is described differently from its label`;
    }
  }
  return null;
}
