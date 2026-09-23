import { type IntakePlan, type IntakeSource, planIntake, sanitizeModelElements } from "./intake";
import { type IntakeOutput, intakeAnalystPrompt, intakeOutputSchema } from "./roles";

export type LiveIntake = (
  prompt: string,
  sources: readonly IntakeSource[],
) => Promise<IntakeOutput>;

function corpus(sources: readonly IntakeSource[]): string {
  return sources.map((source) => source.text).join("\n");
}

/**
 * With no gateway key, return the gap plan and do not invent extracted text.
 * A live call may add exact quotes and proposals; invented supplied facts are dropped.
 */
export async function runIntake(
  sources: readonly IntakeSource[],
  options: { apiKey?: string; live?: LiveIntake },
): Promise<
  IntakePlan & {
    proposals: { text: string; classification: "proposed_embodiment"; proposedByKind: "model" }[];
  }
> {
  const base = planIntake(sources, options.apiKey ? "live" : "not_configured");
  if (!options.apiKey) {
    return { ...base, proposals: [] };
  }
  if (!options.live) {
    return {
      ...planIntake(sources, "not_configured"),
      status: "provider_unavailable",
      extractedByModel: false,
      proposals: [],
    };
  }
  try {
    const output = intakeOutputSchema.parse(await options.live(intakeAnalystPrompt, sources));
    const sanitized = sanitizeModelElements(
      [
        ...output.quotes.map((text) => ({ text, classification: "supplied_fact" as const })),
        ...output.proposals.map((text) => ({
          text,
          classification: "proposed_embodiment" as const,
        })),
      ],
      corpus(sources),
    );
    const questions = [
      ...base.questions,
      ...output.questions.map((question) => ({
        ...question,
        sourceId: null,
        origin: "model" as const,
      })),
    ];
    const seen = new Set(base.elements.map((element) => element.text));
    const elements = [...base.elements];
    for (const element of sanitized.quoted) {
      if (seen.has(element.text)) continue;
      seen.add(element.text);
      elements.push(element);
    }
    return {
      ...base,
      route: "live",
      status: "recorded",
      extractedByModel: true,
      elements,
      questions,
      proposals: sanitized.proposals,
    };
  } catch {
    return {
      ...planIntake(sources, "not_configured"),
      status: "provider_unavailable",
      extractedByModel: false,
      proposals: [],
    };
  }
}
