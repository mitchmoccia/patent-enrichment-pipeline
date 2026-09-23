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
