export const forbiddenModelActions = [
  "approve_gate",
  "change_permissions",
  "sign",
  "file",
  "verify_citation",
  "raise_spend_cap",
] as const;

export type ForbiddenModelAction = (typeof forbiddenModelActions)[number];

export class ModelActionError extends Error {
  readonly code = "POLICY_BLOCKED" as const;
  readonly action: ForbiddenModelAction;
  constructor(action: ForbiddenModelAction) {
    super(`a model cannot ${action.replaceAll("_", " ")}`);
    this.name = "ModelActionError";
    this.action = action;
  }
}

/** A model cannot approve, permission, sign, file, verify its own citation, or raise a cap. */
export function assertModelMay(actorKind: "person" | "model", action: ForbiddenModelAction): void {
  if (actorKind === "model") throw new ModelActionError(action);
}

/** Citation checks are a human comparison against source text. A model cannot verify its own quote. */
export function verifyCitation(
  actorKind: "person" | "model",
  quote: string,
  source: string,
): { verified: boolean } {
  assertModelMay(actorKind, "verify_citation");
  const needle = quote.trim();
  return { verified: needle.length > 0 && source.includes(needle) };
}
