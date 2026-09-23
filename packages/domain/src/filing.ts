import { RuleError } from "./rules";

const day = /^\d{4}-\d{2}-\d{2}$/;

/** A new embodiment cannot inherit a filing date from before it existed. */
export function assertFilingCoversEmbodiment(developedOn: string, filingOn: string): void {
  if (!day.test(developedOn) || !day.test(filingOn)) {
    throw new RuleError("a filing date needs day precision on both the embodiment and the filing");
  }
  if (filingOn < developedOn) {
    throw new RuleError("a new embodiment cannot receive an earlier filing date");
  }
}

/** Entity applicant mode cannot take the individual self-filer release. */
export function assertSelfFilerRelease(applicantMode: string): void {
  if (applicantMode === "entity_applicant") {
    throw new RuleError("an entity applicant cannot select a self-filer release");
  }
}
