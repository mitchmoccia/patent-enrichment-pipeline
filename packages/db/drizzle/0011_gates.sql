CREATE TABLE "gate_evaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "gate_id" text NOT NULL,
  "policy_version" text NOT NULL,
  "dependency_digest" text NOT NULL,
  "snapshot_revision" integer NOT NULL,
  "outcome" text NOT NULL,
  "explanation" text NOT NULL,
  "evaluator_kind" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "gate_evaluations_outcome" CHECK (outcome IN ('needs_information', 'needs_review', 'fail', 'pass')),
  CONSTRAINT "gate_evaluations_evaluator" CHECK (evaluator_kind IN ('deterministic', 'human', 'model')),
  CONSTRAINT "gate_evaluations_model_cannot_pass" CHECK (evaluator_kind <> 'model' OR outcome <> 'pass'),
  CONSTRAINT "gate_evaluations_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "gate_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "manifest_digest" text NOT NULL,
  "capacity" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "gate_releases_capacity" CHECK (capacity IN ('inventor', 'individual_applicant', 'technical_reviewer')),
  CONSTRAINT "gate_releases_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION gate_rows_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'gate evaluations and releases are immutable';
END $$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER gate_evaluations_no_mutate
  BEFORE UPDATE ON gate_evaluations
  FOR EACH ROW EXECUTE FUNCTION gate_rows_immutable();--> statement-breakpoint
CREATE TRIGGER gate_releases_no_mutate
  BEFORE UPDATE ON gate_releases
  FOR EACH ROW EXECUTE FUNCTION gate_rows_immutable();
