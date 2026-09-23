CREATE TABLE "legal_sources" (
  "source_key" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "kind" text NOT NULL,
  "published_on" text NOT NULL,
  "effective_on" text NOT NULL,
  "superseded_by" text,
  "review_status" text DEFAULT 'seeded' NOT NULL,
  "counsel_approved" boolean DEFAULT false NOT NULL,
  CONSTRAINT "legal_sources_not_counsel_approved" CHECK (counsel_approved = false)
);--> statement-breakpoint
INSERT INTO "legal_sources" ("source_key", "title", "kind", "published_on", "effective_on", "superseded_by", "review_status", "counsel_approved") VALUES
  ('uspto-ai-inventorship-2024', '2024 USPTO AI inventorship guidance', 'agency_guidance', '2024-02-13', '2024-02-13', 'uspto-ai-inventorship-2025', 'seeded', false),
  ('uspto-ai-inventorship-2025', '2025 USPTO revised inventorship guidance for AI-assisted inventions', 'agency_guidance', '2025-11-28', '2025-11-28', NULL, 'seeded', false);--> statement-breakpoint
CREATE TABLE "contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "role" text NOT NULL,
  "person_label" text NOT NULL,
  "account" text NOT NULL,
  "legal_inventorship" text DEFAULT 'unresolved' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "contributions_role" CHECK (role IN ('inventor', 'applicant', 'owner', 'assignment_obligation')),
  CONSTRAINT "contributions_inventorship" CHECK (legal_inventorship = 'unresolved'),
  CONSTRAINT "contributions_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "chronology_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "precision" text NOT NULL,
  "event_date" text,
  "note" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chronology_events_kind" CHECK (kind IN ('disclosure', 'sale', 'filing')),
  CONSTRAINT "chronology_events_precision" CHECK (precision IN ('day', 'month', 'year', 'unknown')),
  CONSTRAINT "chronology_events_unknown_date" CHECK (precision <> 'unknown' OR event_date IS NULL),
  CONSTRAINT "chronology_events_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "embodiments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "label" text NOT NULL,
  "developed_on" text NOT NULL,
  "filing_on" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "embodiments_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "matter_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "source_key" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "matter_rules_source" UNIQUE("matter_id","source_key"),
  CONSTRAINT "matter_rules_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "release_choices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "label" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "release_choices_matter" UNIQUE("matter_id"),
  CONSTRAINT "release_choices_label" CHECK (label = 'self-filer'),
  CONSTRAINT "release_choices_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
