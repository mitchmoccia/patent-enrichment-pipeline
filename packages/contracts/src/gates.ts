/**
 * Gate catalog (labels + phase) derived from docs/handoff/policies/gates.json and
 * PIPELINE_GATES.md. Used to present the pipeline roadmap in the UI. Actual gate
 * evaluation is implemented in later slices; until then every gate is "pending".
 */
import type { GateId } from "./enums";

export type GatePhase = "pre_filing" | "post_filing";

export interface GateCatalogEntry {
  id: GateId;
  label: string;
  phase: GatePhase;
  /** The build slice that implements this gate's evaluator. */
  slice: string;
}

export const GATE_CATALOG: readonly GateCatalogEntry[] = [
  { id: "G00", label: "Mandate and processing", phase: "pre_filing", slice: "S03" },
  { id: "G01", label: "Artifact integrity", phase: "pre_filing", slice: "S02" },
  { id: "G02", label: "Mechanism sufficiency", phase: "pre_filing", slice: "S04" },
  { id: "G03", label: "Inventorship, ownership and chronology", phase: "pre_filing", slice: "S05" },
  { id: "G04", label: "Research scope and current authority", phase: "pre_filing", slice: "S06" },
  { id: "G05", label: "Prior art: novelty and obviousness", phase: "pre_filing", slice: "S07" },
  { id: "G06", label: "Subject-matter eligibility", phase: "pre_filing", slice: "S07" },
  { id: "G07", label: "Embodiments and design-around", phase: "pre_filing", slice: "S09" },
  { id: "G08", label: "Claim architecture", phase: "pre_filing", slice: "S08" },
  { id: "G09", label: "Disclosure and figures", phase: "pre_filing", slice: "S10" },
  { id: "G10", label: "Independent challenge", phase: "pre_filing", slice: "S11" },
  { id: "G11", label: "Commercial assessment", phase: "pre_filing", slice: "S13" },
  { id: "G12", label: "Reproducible export", phase: "pre_filing", slice: "S12" },
  { id: "G13", label: "Human release", phase: "pre_filing", slice: "S11" },
  { id: "G14", label: "Filing receipt reconciliation", phase: "post_filing", slice: "S14" },
  { id: "G15", label: "Prosecution readiness", phase: "post_filing", slice: "S14" },
  { id: "G16", label: "Portfolio watch", phase: "post_filing", slice: "S15" },
];
