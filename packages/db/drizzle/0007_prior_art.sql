CREATE TABLE "claim_limitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "claim_limitations_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "prior_art_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "limitation_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "legal_status" text NOT NULL,
  "reason" text,
  "relevance" text NOT NULL,
  "quote" text NOT NULL,
  "motivation" text,
  "reference_ids" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "prior_art_findings_kind" CHECK (kind IN ('anticipation', 'obviousness', 'technical_similarity')),
  CONSTRAINT "prior_art_findings_legal_status" CHECK (legal_status IN ('supported', 'rejected')),
  CONSTRAINT "prior_art_findings_relevance" CHECK (relevance IN ('relevant', 'not_assessed')),
  CONSTRAINT "prior_art_findings_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "eligibility_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "limitation_id" uuid NOT NULL,
  "answer" text NOT NULL,
  "legal_status" text NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "eligibility_reviews_legal_status" CHECK (legal_status IN ('supported', 'rejected')),
  CONSTRAINT "eligibility_reviews_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
