CREATE TYPE "public"."artifact_origin" AS ENUM('upload', 'repository_snapshot', 'public_reference', 'derived', 'experiment');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('quarantined', 'clean', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."confidentiality" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."ownership_status" AS ENUM('asserted_owned', 'licensed', 'public', 'third_party', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."extraction_quality" AS ENUM('verified', 'machine_extracted', 'uncertain');--> statement-breakpoint
CREATE TABLE "artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "original_name" text NOT NULL,
  "media_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "object_key" text DEFAULT '' NOT NULL,
  "object_version" text DEFAULT '' NOT NULL,
  "sha256" text NOT NULL,
  "storage_driver" text NOT NULL,
  "origin" "artifact_origin" DEFAULT 'upload' NOT NULL,
  "confidentiality" "confidentiality" DEFAULT 'confidential' NOT NULL,
  "uploader_id" text NOT NULL,
  "ownership_status" "ownership_status" DEFAULT 'asserted_owned' NOT NULL,
  "scan_status" "scan_status" NOT NULL,
  "scan_detail" text,
  "extracted_text" text,
  "parent_artifact_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "artifacts_tenant_matter_id" UNIQUE("tenant_id","matter_id","id"),
  CONSTRAINT "artifacts_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "source_spans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "artifact_id" uuid NOT NULL,
  "locator" jsonb NOT NULL,
  "excerpt" text NOT NULL,
  "excerpt_sha256" text NOT NULL,
  "extraction_version" text NOT NULL,
  "extraction_quality" "extraction_quality" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "source_spans_artifact_fk" FOREIGN KEY ("tenant_id","matter_id","artifact_id") REFERENCES "public"."artifacts"("tenant_id","matter_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.reject_artifact_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'artifacts are immutable; corrections are new versions';
END $$;--> statement-breakpoint
CREATE TRIGGER artifacts_no_update BEFORE UPDATE ON public.artifacts
FOR EACH ROW EXECUTE FUNCTION public.reject_artifact_update();--> statement-breakpoint
CREATE TRIGGER source_spans_no_update BEFORE UPDATE ON public.source_spans
FOR EACH ROW EXECUTE FUNCTION public.reject_artifact_update();
