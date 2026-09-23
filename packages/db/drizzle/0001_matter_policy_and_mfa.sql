ALTER TABLE "matters" ADD COLUMN "processing_policy" jsonb;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "run_budget_microusd" text;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_budget_digits" CHECK (run_budget_microusd IS NULL OR run_budget_microusd ~ '^[0-9]+$');--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_no_training_use" CHECK (processing_policy IS NULL OR (processing_policy->>'trainingUseAllowed') = 'false');--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "failed_verification_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD COLUMN "locked_until" timestamp with time zone;
