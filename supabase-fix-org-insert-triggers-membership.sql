-- Relax INSERT triggers: allow explicit organization_id when the user is a member
-- (not only when it matches JWT-derived current_organization_id()).
-- Run after supabase-migration-multi-org-rls.sql and supabase-migration-budgets.sql.
--
-- Without this, budgets/events saved while JWT metadata lags still fail RLS vs trigger
-- mismatch; server sends correct organization_id from cookie-resolved session.

CREATE OR REPLACE FUNCTION public.monthly_budgets_set_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_org UUID;
BEGIN
  jwt_org := public.current_organization_id();

  IF NEW.organization_id IS NULL THEN
    IF jwt_org IS NULL THEN
      RAISE EXCEPTION 'User has no organization membership';
    END IF;
    NEW.organization_id := jwt_org;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.events_set_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_org UUID;
BEGIN
  jwt_org := public.current_organization_id();

  IF NEW.organization_id IS NULL THEN
    IF jwt_org IS NULL THEN
      RAISE EXCEPTION 'User has no organization membership';
    END IF;
    NEW.organization_id := jwt_org;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN NEW;
END;
$$;
