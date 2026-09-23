import { z } from "zod";

/** Intake analyst output. Supplied facts must be exact quotes; other text is a proposal. */
export const intakeOutputSchema = z.object({
  quotes: z.array(z.string()).max(12),
  proposals: z.array(z.string()).max(8).default([]),
  questions: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        whyItMatters: z.string().min(1).max(500),
        affectedFeature: z.string().min(1).max(120),
      }),
    )
    .max(8),
});

export type IntakeOutput = z.infer<typeof intakeOutputSchema>;

export const intakeAnalystPrompt = [
  "You are the intake analyst.",
  "Quote only sentences that appear in the supplied sources.",
  "Do not invent a mechanism, a date, an inventor, or a citation.",
  "Ask a question when a payment outcome or retry is unspecified.",
  "Label nothing you wrote as a fact the inventor supplied.",
].join(" ");
