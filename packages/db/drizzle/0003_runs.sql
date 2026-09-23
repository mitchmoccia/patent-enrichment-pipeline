CREATE TYPE "public"."run_status" AS ENUM('running', 'paused', 'cancelled', 'completed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."stage_name" AS ENUM('ingest', 'analyze');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'leased', 'completed', 'cancelled', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('leased', 'committed', 'stale', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'committed', 'unknown', 'released', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."external_status" AS ENUM('prepared', 'dispatched', 'completed', 'unknown');--> statement-breakpoint
CREATE TABLE "runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "status" "run_status" DEFAULT 'running' NOT NULL,
  "snapshot_revision" integer NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "fence_token" integer DEFAULT 0 NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "runs_tenant_matter_id" UNIQUE("tenant_id","matter_id","id"),
  CONSTRAINT "runs_idempotency" UNIQUE("tenant_id","matter_id","created_by","idempotency_key"),
  CONSTRAINT "runs_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "name" "stage_name" NOT NULL,
  "status" "stage_status" DEFAULT 'pending' NOT NULL,
  "output" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "stages_run_name" UNIQUE("run_id","name"),
  CONSTRAINT "stages_run_fk" FOREIGN KEY ("tenant_id","matter_id","run_id") REFERENCES "public"."runs"("tenant_id","matter_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "step_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "fence_token" integer NOT NULL,
  "status" "attempt_status" DEFAULT 'leased' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "step_attempts_stage_number" UNIQUE("stage_id","attempt_number"),
  CONSTRAINT "step_attempts_run_fence" UNIQUE("run_id","fence_token"),
  CONSTRAINT "step_attempts_run_fk" FOREIGN KEY ("tenant_id","matter_id","run_id") REFERENCES "public"."runs"("tenant_id","matter_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "idempotency_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "actor_id" text NOT NULL,
  "operation" text NOT NULL,
  "key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "idempotency_commands_key" UNIQUE("tenant_id","matter_id","actor_id","operation","key"),
  CONSTRAINT "idempotency_commands_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "operation_id" text NOT NULL,
  "status" "reservation_status" DEFAULT 'reserved' NOT NULL,
  "amount_microusd" text,
  "known" boolean DEFAULT true NOT NULL,
  "request_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reservations_operation" UNIQUE("tenant_id","operation_id"),
  CONSTRAINT "reservations_amount_digits" CHECK (amount_microusd IS NULL OR amount_microusd ~ '^[0-9]+$'),
  CONSTRAINT "reservations_run_fk" FOREIGN KEY ("tenant_id","matter_id","run_id") REFERENCES "public"."runs"("tenant_id","matter_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "external_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "operation_id" text NOT NULL,
  "status" "external_status" DEFAULT 'prepared' NOT NULL,
  "request_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "external_operations_operation" UNIQUE("tenant_id","operation_id"),
  CONSTRAINT "external_operations_run_fk" FOREIGN KEY ("tenant_id","matter_id","run_id") REFERENCES "public"."runs"("tenant_id","matter_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "event_sequence" integer NOT NULL,
  "kind" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "outbox_matter_sequence" UNIQUE("tenant_id","matter_id","event_sequence"),
  CONSTRAINT "outbox_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "matter_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "sequence" integer NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "matter_events_sequence" UNIQUE("tenant_id","matter_id","sequence"),
  CONSTRAINT "matter_events_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "callback_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "callback_id" text NOT NULL,
  "operation_id" text NOT NULL,
  "payload_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "callback_receipts_callback" UNIQUE("tenant_id","callback_id"),
  CONSTRAINT "callback_receipts_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE "run_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "actor_id" text NOT NULL,
  "snapshot_revision" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "run_decisions_kind" CHECK (kind IN ('pause', 'cancel', 'resume')),
  CONSTRAINT "run_decisions_run_fk" FOREIGN KEY ("tenant_id","matter_id","run_id") REFERENCES "public"."runs"("tenant_id","matter_id","id") ON DELETE cascade
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.reject_event_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'matter_events are immutable';
END $$;--> statement-breakpoint
CREATE TRIGGER matter_events_no_update BEFORE UPDATE ON public.matter_events
FOR EACH ROW EXECUTE FUNCTION public.reject_event_update();
