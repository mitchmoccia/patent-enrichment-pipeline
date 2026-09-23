/**
 * Primitive identifier and time aliases shared across the platform contracts.
 * These mirror docs/handoff/contracts/domain.ts. Runtime Zod schemas and
 * database constraints are layered on top in later slices.
 */
export type Id = string;
export type Digest = string;
export type ISODateTime = string;
