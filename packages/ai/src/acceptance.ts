export interface ModelSuggestion {
  text: string;
  classification: "proposed_embodiment";
  proposedByKind: "model";
}

export interface AcceptedSuggestion {
  text: string;
  classification: "proposed_embodiment";
  proposedByKind: "model";
  acceptedAt: string;
  inventionDate: null;
  inventorship: "unresolved";
}

/**
 * Acceptance records the person and the time they accepted. It does not move
 * the invention date backward or decide inventorship.
 */
export function acceptModelSuggestion(
  suggestion: ModelSuggestion,
  acceptedAt: string,
): AcceptedSuggestion {
  if (suggestion.proposedByKind !== "model") {
    throw new Error("only a model suggestion is accepted through this path");
  }
  if (suggestion.classification !== "proposed_embodiment") {
    throw new Error("a model suggestion cannot be stored as a supplied fact");
  }
  return {
    text: suggestion.text,
    classification: "proposed_embodiment",
    proposedByKind: "model",
    acceptedAt,
    inventionDate: null,
    inventorship: "unresolved",
  };
}
