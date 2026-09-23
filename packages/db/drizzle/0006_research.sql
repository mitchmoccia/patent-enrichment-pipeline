CREATE TABLE "imported_references" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "title" text NOT NULL,
  "publication_number" text,
  "publication_date" text,
  "family_date" text,
  "full_text" text,
  "full_text_status" text NOT NULL,
  "passage" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "imported_references_full_text_status" CHECK (full_text_status IN ('available', 'unavailable')),
  CONSTRAINT "imported_references_full_text_pair" CHECK (
    (full_text_status = 'available' AND full_text IS NOT NULL)
    OR (full_text_status = 'unavailable' AND full_text IS NULL)
  ),
  CONSTRAINT "imported_references_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "research_queries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "query" text NOT NULL,
  "plan" jsonb NOT NULL,
  "stop_reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "research_queries_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
