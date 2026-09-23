import { RuleError } from "./rules";

export interface ClaimLimitation {
  id: string;
  text: string;
  actor: string | null;
}

export interface ClaimDraft {
  id: string;
  category: "method" | "system";
  dependsOn: string | null;
  connective: "and" | "or";
  limitations: ClaimLimitation[];
}

export function dependencyCycle(
  claims: readonly { id: string; dependsOn: string | null }[],
): boolean {
  const parents = new Map(claims.map((claim) => [claim.id, claim.dependsOn]));
  for (const claim of claims) {
    const seen = new Set<string>();
    let cursor: string | null = claim.id;
    while (cursor) {
      if (seen.has(cursor)) return true;
      seen.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  }
  return false;
}

export function categoryMismatch(claim: ClaimDraft, parent: ClaimDraft | null): boolean {
  return Boolean(claim.dependsOn && parent && parent.category !== claim.category);
}

export function removedLimitations(
  before: readonly ClaimLimitation[],
  after: readonly ClaimLimitation[],
): string[] {
  const next = new Set(after.map((item) => item.id));
  return before.filter((item) => !next.has(item.id)).map((item) => item.id);
}

export function contradictoryQuantifiers(text: string): boolean {
  const lower = text.toLowerCase();
  const broad = /at least one|one or more|\ball\b/.test(lower);
  const none = /\bnone\b|exactly zero/.test(lower);
  return broad && none;
}

export function supportCrossesIncompatible(
  embodimentIds: readonly string[],
  conflicts: readonly { left: string; right: string }[],
): boolean {
  const used = new Set(embodimentIds);
  return conflicts.some((conflict) => used.has(conflict.left) && used.has(conflict.right));
}

export function assertClaimSet(claims: readonly ClaimDraft[]): void {
  if (dependencyCycle(claims)) throw new RuleError("dependent claims cannot cycle");
  const byId = new Map(claims.map((claim) => [claim.id, claim]));
  for (const claim of claims) {
    const parent = claim.dependsOn ? (byId.get(claim.dependsOn) ?? null) : null;
    if (claim.dependsOn && !parent) throw new RuleError("a dependent claim needs its parent");
    if (categoryMismatch(claim, parent)) {
      throw new RuleError("a dependent claim cannot change category");
    }
    const text = claim.limitations.map((item) => item.text).join(" ");
    if (contradictoryQuantifiers(text)) {
      throw new RuleError("a claim cannot require both a quantity and none of it");
    }
  }
}
