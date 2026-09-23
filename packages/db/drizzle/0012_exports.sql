CREATE TABLE "export_manifests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "package_digest" text NOT NULL,
  "manifest_digest" text NOT NULL,
  "files" jsonb NOT NULL,
  "pdf_status" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "export_manifests_pdf_status" CHECK (pdf_status IN ('text_only', 'review_rendering_unavailable')),
  CONSTRAINT "export_manifests_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
