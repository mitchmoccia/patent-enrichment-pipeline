CREATE TABLE "claim_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "category" text NOT NULL,
  "depends_on" uuid,
  "connective" text NOT NULL,
  "limitations" jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "support_status" text DEFAULT 'current' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "claim_drafts_category" CHECK (category IN ('method', 'system')),
  CONSTRAINT "claim_drafts_connective" CHECK (connective IN ('and', 'or')),
  CONSTRAINT "claim_drafts_support_status" CHECK (support_status IN ('current', 'stale')),
  CONSTRAINT "claim_drafts_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "embodiment_conflicts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "left_embodiment_id" uuid NOT NULL,
  "right_embodiment_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "embodiment_conflicts_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "claim_support" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "claim_id" uuid NOT NULL,
  "limitation_id" text NOT NULL,
  "embodiment_id" uuid NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "claim_support_status" CHECK (status IN ('current', 'stale')),
  CONSTRAINT "claim_support_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
