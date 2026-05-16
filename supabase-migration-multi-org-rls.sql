-- Multi-dealership: multiple organization memberships + JWT-driven active org for RLS.
-- Run in Supabase SQL Editor after supabase-migration-organizations.sql and supabase-migration-rbac.sql.
--
-- PRODUCTION RUN ORDER (once per Supabase project)
--   1) Run this file (supabase-migration-multi-org-rls.sql).
--   2) Run supabase-seed-west-bend-dealership.sql.
--   3) Deploy the app build that includes switch-dealership UI + switchOrganization action.
--   4) Have users sign out and sign in once so JWT picks up user_metadata if needed.
--
-- If ALTER TABLE ... DROP CONSTRAINT fails, list constraints in SQL Editor:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'public.organization_members'::regclass;
--   SELECT conname FROM pg_constraint WHERE conrelid = 'public.user_roles'::regclass;
-- and drop the UNIQUE constraint on user_id only before re-running this file.
--
-- JWT: app sets Supabase Auth user_metadata.active_organization_id (UUID string) via updateUser when switching.
-- RLS resolves public.current_organization_id() from validated membership rows only.

-- ---------------------------------------------------------------------------
-- 1. Constraints: multi-membership and per-org roles
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_key;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_user_id_organization_id_key
  UNIQUE (user_id, organization_id);

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_organization_id_key UNIQUE (user_id, organization_id);

-- ---------------------------------------------------------------------------
-- 2. Organization members SELECT: rows for own user_id (every dealership)
--    so organizations subquery resolves all joined org IDs.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Read members in same organization" ON public.organization_members;

CREATE POLICY "Read own memberships"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. current_organization_id: prefer validated JWT hint, fallback oldest membership
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw text;
  chosen uuid;
BEGIN
  BEGIN
    raw := auth.jwt() -> 'user_metadata' ->> 'active_organization_id';
  EXCEPTION WHEN OTHERS THEN
    raw := NULL;
  END;

  chosen := NULL;
  IF raw IS NOT NULL THEN
    raw := trim(raw);
    IF length(raw) > 0 THEN
      BEGIN
        chosen := raw::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        chosen := NULL;
      END;
    END IF;
  END IF;

  IF chosen IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = chosen
  ) THEN
    RETURN chosen;
  END IF;

  RETURN (
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC NULLS LAST, organization_id ASC
    LIMIT 1
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. current_app_role: scope to resolved active organization
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id = public.current_organization_id()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 5. Scope admin/manager helpers to the active dealership
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_organization_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role = 'admin'
      AND ur.organization_id = public.current_organization_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_events(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role IN ('admin', 'manager')
      AND ur.organization_id = public.current_organization_id()
  );
$$;
