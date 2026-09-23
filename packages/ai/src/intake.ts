export interface IntakeSource {
  id: string;
  text: string;
  /** Question-origin text is asked, not stored as a supplied fact. */
  role: "idea" | "supplied" | "question";
}

export interface QuotedElement {
  kind: "supplied_statement";
  text: string;
  sourceId: string;
  classification: "supplied_fact";
  proposedByKind: "person";
}

export interface GapQuestion {
  text: string;
  whyItMatters: string;
  affectedFeature: string;
  sourceId: string | null;
  origin: "deterministic_gap" | "model";
}

export interface DevelopmentTask {
  text: string;
  reason: string;
}

export interface IntakePlan {
  route: "not_configured" | "live";
  status: "provider_unavailable" | "recorded";
  /** True only after a live model response is accepted. */
  extractedByModel: boolean;
  elements: QuotedElement[];
  questions: GapQuestion[];
  tasks: DevelopmentTask[];
}

const PAYMENT_GAP =
  "The supplied record does not say what prevents a second charge when the provider accepts and the worker then times out.";

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function corpusOf(sources: readonly IntakeSource[]): string {
  return sources.map((source) => source.text).join("\n");
}

function isVague(sources: readonly IntakeSource[]): boolean {
  const idea = sources.find((source) => source.role === "idea")?.text ?? "";
  const supplied = sources.filter((source) => source.role === "supplied");
  const words = idea
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const mentionsMechanism = /\b(state|store|retry|timeout|reserve|commit|worker|ledger)\b/i.test(
    corpusOf(sources),
  );
  return words.length < 8 && supplied.length === 0 && !mentionsMechanism;
}

function paymentQuestion(sources: readonly IntakeSource[]): GapQuestion | null {
  const hit = sources.find(
    (source) => /payment/i.test(source.text) && /timeout|accepts a request/i.test(source.text),
  );
  if (!hit) return null;
  return {
    text: hit.role === "question" ? hit.text : PAYMENT_GAP,
    whyItMatters:
      "An accepted charge with no recorded outcome can be spent twice if the retry submits it again.",
    affectedFeature: "payment outcome",
    sourceId: hit.id,
    origin: "deterministic_gap",
  };
}

/** Gap plan from supplied text only. It does not write mechanism prose that was not supplied. */
export function planIntake(
  sources: readonly IntakeSource[],
  route: IntakePlan["route"],
): IntakePlan {
  if (isVague(sources)) {
    return {
      route,
      status: "provider_unavailable",
      extractedByModel: false,
      elements: [],
      questions: [],
      tasks: [
        {
          text: "Name the state that changes, who may change it, and what a retry must not repeat.",
          reason: "The idea does not identify an executable mechanism.",
        },
      ],
    };
  }
  const elements: QuotedElement[] = [];
  for (const source of sources) {
    if (source.role !== "supplied") continue;
    for (const text of sentences(source.text)) {
      if (!source.text.includes(text)) continue;
      elements.push({
        kind: "supplied_statement",
        text,
        sourceId: source.id,
        classification: "supplied_fact",
        proposedByKind: "person",
      });
    }
  }
  const questions: GapQuestion[] = [];
  const payment = paymentQuestion(sources);
  if (payment) questions.push(payment);
  const joined = corpusOf(sources);
  if (!/reconcil/i.test(joined)) {
    questions.push({
      text: "What record shows whether the provider accepted the operation after the worker stopped waiting?",
      whyItMatters: "Without that record the system cannot tell a retry from a second spend.",
      affectedFeature: "reconciliation",
      sourceId: payment?.sourceId ?? null,
      origin: "deterministic_gap",
    });
  }
  return {
    route,
    status: route === "live" ? "recorded" : "provider_unavailable",
    extractedByModel: false,
    elements,
    questions,
    tasks: [],
  };
}

export interface ModelElement {
  text: string;
  classification: "supplied_fact" | "proposed_embodiment";
}

export interface ModelProposal {
  text: string;
  classification: "proposed_embodiment";
  proposedByKind: "model";
}

/**
 * Exact quotes can stay supplied facts. Text the model wrote is a proposal.
 * A supplied-fact label on text that is not in the corpus is rejected.
 */
export function sanitizeModelElements(
  elements: readonly ModelElement[],
  corpus: string,
): { quoted: QuotedElement[]; proposals: ModelProposal[]; rejected: string[] } {
  const quoted: QuotedElement[] = [];
  const proposals: ModelProposal[] = [];
  const rejected: string[] = [];
  for (const element of elements) {
    const text = element.text.trim();
    if (text.length === 0) continue;
    if (corpus.includes(text)) {
      quoted.push({
        kind: "supplied_statement",
        text,
        sourceId: "model-quote",
        classification: "supplied_fact",
        proposedByKind: "person",
      });
      continue;
    }
    if (element.classification === "supplied_fact") {
      rejected.push(text);
      continue;
    }
    proposals.push({ text, classification: "proposed_embodiment", proposedByKind: "model" });
  }
  return { quoted, proposals, rejected };
}
