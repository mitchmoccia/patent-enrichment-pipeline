-- Row-Level Security, tenant-context helpers and application-role grants.
-- Applied by the migration (owner) role AFTER drizzle migrations. Idempotent.
--
-- Model: the owner role (migrations + SECURITY DEFINER helpers) is the table
-- owner and bypasses RLS. The application role (patent_app) is a non-owner and
-- is therefore fully subject to these policies.

-- ---------------------------------------------------------------------------
-- Transaction-local identity accessors (set via set_config(..., true)).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_current_tenant() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.tenant_id', true) $$;

CREATE OR REPLACE FUNCTION public.app_current_user() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.user_id', true) $$;

-- SECURITY DEFINER ACL check. Runs as the owner (bypasses RLS on matter_acl),
-- with a fixed empty search_path, so policies can call it without recursion.
CREATE OR REPLACE FUNCTION public.app_can_access_matter(p_matter uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matter_acl a
    WHERE a.tenant_id = public.app_current_tenant()
      AND a.matter_id = p_matter
      AND a.principal_id = public.app_current_user()
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on matter-owned tables.
-- ---------------------------------------------------------------------------
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_spans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- matters
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS matters_select ON public.matters;
CREATE POLICY matters_select ON public.matters FOR SELECT USING (
  tenant_id = public.app_current_tenant()
  AND (created_by = public.app_current_user() OR public.app_can_access_matter(id))
);

DROP POLICY IF EXISTS matters_insert ON public.matters;
CREATE POLICY matters_insert ON public.matters FOR INSERT WITH CHECK (
  tenant_id = public.app_current_tenant() AND created_by = public.app_current_user()
);

DROP POLICY IF EXISTS matters_update ON public.matters;
CREATE POLICY matters_update ON public.matters FOR UPDATE USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(id)
) WITH CHECK (tenant_id = public.app_current_tenant());

DROP POLICY IF EXISTS matters_delete ON public.matters;
CREATE POLICY matters_delete ON public.matters FOR DELETE USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(id)
);

-- ---------------------------------------------------------------------------
-- matter_acl (creator can seed the first owner ACL for their new matter)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS matter_acl_select ON public.matter_acl;
CREATE POLICY matter_acl_select ON public.matter_acl FOR SELECT USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS matter_acl_insert ON public.matter_acl;
CREATE POLICY matter_acl_insert ON public.matter_acl FOR INSERT WITH CHECK (
  tenant_id = public.app_current_tenant()
  AND (
    public.app_can_access_matter(matter_id)
    OR EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND m.tenant_id = public.app_current_tenant()
        AND m.created_by = public.app_current_user()
    )
  )
);

DROP POLICY IF EXISTS matter_acl_update ON public.matter_acl;
CREATE POLICY matter_acl_update ON public.matter_acl FOR UPDATE USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (tenant_id = public.app_current_tenant());

DROP POLICY IF EXISTS matter_acl_delete ON public.matter_acl;
CREATE POLICY matter_acl_delete ON public.matter_acl FOR DELETE USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

-- ---------------------------------------------------------------------------
-- matter_snapshots + assertions (access follows matter ACL)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS matter_snapshots_all ON public.matter_snapshots;
CREATE POLICY matter_snapshots_all ON public.matter_snapshots USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS assertions_all ON public.assertions;
CREATE POLICY assertions_all ON public.assertions USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS artifacts_all ON public.artifacts;
CREATE POLICY artifacts_all ON public.artifacts USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS source_spans_all ON public.source_spans;
CREATE POLICY source_spans_all ON public.source_spans USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

-- ---------------------------------------------------------------------------
-- runs, stages, attempts, budget, events (access follows matter ACL)
-- ---------------------------------------------------------------------------
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callback_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runs_all ON public.runs;
CREATE POLICY runs_all ON public.runs USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS stages_all ON public.stages;
CREATE POLICY stages_all ON public.stages USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS step_attempts_all ON public.step_attempts;
CREATE POLICY step_attempts_all ON public.step_attempts USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS idempotency_commands_all ON public.idempotency_commands;
CREATE POLICY idempotency_commands_all ON public.idempotency_commands USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS reservations_all ON public.reservations;
CREATE POLICY reservations_all ON public.reservations USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS external_operations_all ON public.external_operations;
CREATE POLICY external_operations_all ON public.external_operations USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS outbox_all ON public.outbox;
CREATE POLICY outbox_all ON public.outbox USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS matter_events_all ON public.matter_events;
CREATE POLICY matter_events_all ON public.matter_events USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS callback_receipts_all ON public.callback_receipts;
CREATE POLICY callback_receipts_all ON public.callback_receipts USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

DROP POLICY IF EXISTS run_decisions_all ON public.run_decisions;
CREATE POLICY run_decisions_all ON public.run_decisions USING (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
) WITH CHECK (
  tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)
);

-- ---------------------------------------------------------------------------
-- Invention workspace (S04)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'invention_extractions',
    'invention_elements',
    'invention_questions',
    'invention_answers',
    'development_tasks',
    'mechanism_suggestions',
    'invention_analyses'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_all', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I USING (tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id)) WITH CHECK (tenant_id = public.app_current_tenant() AND public.app_can_access_matter(matter_id))',
      table_name || '_all',
      table_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Application-role grants (non-owner; RLS-enforced). Auth tables have no RLS
-- and are managed by Better Auth via this same role.
-- ---------------------------------------------------------------------------
-- The application role is a SQL-created, non-owner role WITHOUT bypassrls
-- (Neon's API-created roles get bypassrls, which would defeat RLS).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'patent_app_rls') THEN
    GRANT USAGE ON SCHEMA public TO patent_app_rls;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO patent_app_rls;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO patent_app_rls;
    GRANT EXECUTE ON FUNCTION public.app_current_tenant() TO patent_app_rls;
    GRANT EXECUTE ON FUNCTION public.app_current_user() TO patent_app_rls;
    GRANT EXECUTE ON FUNCTION public.app_can_access_matter(uuid) TO patent_app_rls;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO patent_app_rls;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO patent_app_rls;
  END IF;
END$$;
