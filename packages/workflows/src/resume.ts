/**
 * A resume payload names a stored decision. An `approved` flag is not a decision
 * and cannot start or continue a run.
 */
export function readResumePayload(payload: unknown): { decisionId: string } {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("resume requires a decision id");
  }
  const record = payload as Record<string, unknown>;
  const decisionId = record.decisionId;
  if (typeof decisionId !== "string" || decisionId.length === 0) {
    throw new Error("resume requires a decision id");
  }
  return { decisionId };
}
