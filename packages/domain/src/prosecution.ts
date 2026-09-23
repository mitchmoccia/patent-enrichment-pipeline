import { RuleError } from "./rules";

export function reconcileFiles(releasedDigest: string, submittedDigest: string) {
  if (!releasedDigest.trim() || !submittedDigest.trim()) {
    throw new RuleError("a receipt needs both file digests");
  }
  return releasedDigest === submittedDigest
    ? ("matched" as const)
    : ("reconciliation_issue" as const);
}

export function assertCanRecordFiled(input: {
  actorKind: string;
  receiptVerified: boolean;
  requested: string;
  viaDownload: boolean;
  viaCheckbox: boolean;
}): "filed" {
  if (input.actorKind === "model") throw new RuleError("a model statement cannot record filing");
  if (input.viaDownload) throw new RuleError("a download is not a filing");
  if (input.viaCheckbox) throw new RuleError("a checkbox is not a filing");
  if (input.requested === "granted_recorded") {
    throw new RuleError("a grant is not recorded from this import");
  }
  if (input.requested !== "filed") throw new RuleError("unknown filing status");
  if (!input.receiptVerified) throw new RuleError("no receipt means filing is not verified");
  return "filed";
}

export function assertAmendmentSupported(input: {
  supportNote: string | null;
  newlyInvented: boolean;
}): void {
  if (input.newlyInvented || !input.supportNote?.trim()) {
    throw new RuleError("unsupported amendment");
  }
}

export function assertDeadlineContext(source: string, rule: string): void {
  if (!source.trim() || !rule.trim()) {
    throw new RuleError("a deadline needs its source and rule");
  }
}

export function extractOfficeClaims(text: string): number[] {
  const found = [...text.matchAll(/claim\s+(\d+)/gi)].map((match) => Number(match[1]));
  return [...new Set(found)];
}
