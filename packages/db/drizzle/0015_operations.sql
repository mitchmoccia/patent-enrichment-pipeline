CREATE TABLE "watch_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "matter_id" uuid NOT NULL,
  "source" text NOT NULL,
  "cadence" text NOT NULL,
  "budget_microusd" text NOT NULL,
  "approved" boolean NOT NULL,
  "demand_letters" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "watch_plans_approved" CHECK (approved = true),
  CONSTRAINT "watch_plans_demand" CHECK (demand_letters = false),
  CONSTRAINT "watch_plans_matter_fk" FOREIGN KEY ("tenant_id","matter_id") REFERENCES "public"."matters"("tenant_id","id") ON DELETE cascade
);
