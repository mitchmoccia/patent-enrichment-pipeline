CREATE TABLE "invention_extractions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "snapshot_revision" integer NOT NULL,
  "route" text NOT NULL,
  "status" text NOT NULL,
  "detail" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invention_extractions_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "invention_elements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "extraction_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "text" text NOT NULL,
  "classification" text NOT NULL,
  "proposed_by_kind" text NOT NULL,
  "source_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invention_elements_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade,
  CONSTRAINT "invention_elements_model_not_fact" CHECK (proposed_by_kind <> 'model' OR classification <> 'supplied_fact')
);--> statement-breakpoint
CREATE TABLE "invention_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "text" text NOT NULL,
  "why_it_matters" text NOT NULL,
  "affected_feature" text NOT NULL,
  "source_id" text,
  "origin" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invention_questions_text" UNIQUE("matter_id","text"),
  CONSTRAINT "invention_questions_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "invention_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "text" text NOT NULL,
  "answered_at" timestamp with time zone NOT NULL,
  "answered_by" text NOT NULL,
  "snapshot_revision" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invention_answers_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "development_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "text" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "development_tasks_text" UNIQUE("matter_id","text"),
  CONSTRAINT "development_tasks_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "mechanism_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "text" text NOT NULL,
  "classification" text NOT NULL,
  "proposed_by_kind" text NOT NULL,
  "status" text DEFAULT 'proposed' NOT NULL,
  "accepted_at" timestamp with time zone,
  "invention_date" text,
  "inventorship" text DEFAULT 'unresolved' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mechanism_suggestions_text" UNIQUE("matter_id","text"),
  CONSTRAINT "mechanism_suggestions_no_invention_date" CHECK (invention_date IS NULL),
  CONSTRAINT "mechanism_suggestions_inventorship" CHECK (inventorship = 'unresolved'),
  CONSTRAINT "mechanism_suggestions_class" CHECK (classification = 'proposed_embodiment'),
  CONSTRAINT "mechanism_suggestions_origin" CHECK (proposed_by_kind = 'model'),
  CONSTRAINT "mechanism_suggestions_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "invention_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "snapshot_revision" integer NOT NULL,
  "status" text NOT NULL,
  "subject" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invention_analyses_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
