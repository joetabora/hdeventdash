-- App-level user mirror: email + auth metadata, linked from organization_members.
-- Run in Supabase SQL Editor after supabase-migration-organizations.sql (and RBAC).
-- Replaces the need to scan auth.users via Admin listUsers for org member lists.

-- ---------------------------------------------------------------------------
-- 1. Table (id = auth.users.id)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.app_users IS
  'Mirror of auth user identity fields for RLS-friendly queries; keep in sync via auth triggers.';
COMMENT ON COLUMN public.app_users.raw_user_meta_data IS
  'Copy of auth.users.raw_user_meta_data; app display names may live here.';

CREATE INDEX IF NOT EXISTS idx_app_users_email_lower ON public.app_users (lower(email));

-- ---------------------------------------------------------------------------
-- 2. Backfill from existing auth users
-- ---------------------------------------------------------------------------

INSERT INTO public.app_users (id, email, raw_user_meta_data, created_at, updated_at)
SELECT
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data, '{}'::jsonb),
  coalesce(u.created_at, NOW()),
  coalesce(u.updated_at, NOW())
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------------
-- 3. Sync from auth (new signups + email/metadata changes)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.app_users_sync_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.app_users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (
      NEW.id,
      coalesce(NEW.email, ''),
      coalesce(NEW.raw_user_meta_data, '{}'::jsonb),
      coalesce(NEW.created_at, NOW()),
      coalesce(NEW.updated_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      email = excluded.email,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.app_users
    SET
      email = coalesce(NEW.email, ''),
      raw_user_meta_data = coalesce(NEW.raw_user_meta_data, '{}'::jsonb),
      updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_sync_app_users_insert ON auth.users;
DROP TRIGGER IF EXISTS trg_auth_users_sync_app_users_update ON auth.users;
DROP TRIGGER IF EXISTS trg_auth_users_sync_app_users ON auth.users;
CREATE TRIGGER trg_auth_users_sync_app_users
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.app_users_sync_from_auth();

-- ---------------------------------------------------------------------------
-- 4. Point organization_members at app_users (same UUID as auth.users)
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.app_users (id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 5. RLS: org admins read profiles for users in the active organization only
-- ---------------------------------------------------------------------------

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins read member app_users" ON public.app_users;
CREATE POLICY "Org admins read member app_users"
  ON public.app_users FOR SELECT TO authenticated
  USING (
    public.is_organization_admin(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = app_users.id
        AND om.organization_id = public.current_organization_id()
    )
  );

GRANT SELECT ON public.app_users TO authenticated;
