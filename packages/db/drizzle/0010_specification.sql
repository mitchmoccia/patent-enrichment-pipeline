CREATE TABLE "specification_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "text" text NOT NULL,
  "hypothetical" boolean DEFAULT false NOT NULL,
  "evidence_note" text,
  "revision" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "specification_sections_kind" CHECK (kind IN ('abstract', 'description', 'claims')),
  CONSTRAINT "specification_sections_kind_unique" UNIQUE ("matter_id", "kind"),
  CONSTRAINT "specification_sections_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "specification_figures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "numeral" text NOT NULL,
  "label" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "specification_figures_numeral" UNIQUE ("matter_id", "numeral"),
  CONSTRAINT "specification_figures_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "terminology" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "term" text NOT NULL,
  "definition" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "terminology_term" UNIQUE ("matter_id", "term"),
  CONSTRAINT "terminology_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
