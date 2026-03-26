-- Monthly budgets per location + per-event planned/actual spend.
-- Run after supabase-migration-organizations.sql and supabase-migration-rbac.sql
-- (and after event_type migration if applied — replaces events_enforce_staff_update).

-- ---------------------------------------------------------------------------
-- 1. Event budget columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS planned_budget numeric(12, 2),
  ADD COLUMN IF NOT EXISTS actual_budget numeric(12, 2);

COMMENT ON COLUMN public.events.planned_budget IS 'Planned spend for this event ($)';
COMMENT ON COLUMN public.events.actual_budget IS 'Actual spend after the event ($, optional)';

-- ---------------------------------------------------------------------------
-- 2. Monthly budgets (org + calendar month + location)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  budget_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, month, location)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_org_month
  ON public.monthly_budgets(organization_id, month);

COMMENT ON TABLE public.monthly_budgets IS 'Cap per org per calendar month per location (location matches event.location)';
COMMENT ON COLUMN public.monthly_budgets.month IS 'First day of calendar month (e.g. 2025-03-01)';

-- ---------------------------------------------------------------------------
-- 3. monthly_budgets: org on insert + updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.monthly_budgets_set_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected UUID;
BEGIN
  expected := public.current_organization_id();
  IF expected IS NULL THEN
    RAISE EXCEPTION 'User has no organization membership';
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := expected;
  ELSIF NEW.organization_id IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'organization_id does not match your organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_budgets_set_organization ON public.monthly_budgets;
CREATE TRIGGER trg_monthly_budgets_set_organization
  BEFORE INSERT ON public.monthly_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.monthly_budgets_set_organization();

DROP TRIGGER IF EXISTS on_monthly_budgets_updated ON public.monthly_budgets;
CREATE TRIGGER on_monthly_budgets_updated
  BEFORE UPDATE ON public.monthly_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Normalize month to first day of month (optional safety)
CREATE OR REPLACE FUNCTION public.monthly_budgets_normalize_month()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.month := date_trunc('month', NEW.month)::date;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_budgets_normalize_month ON public.monthly_budgets;
CREATE TRIGGER trg_monthly_budgets_normalize_month
  BEFORE INSERT OR UPDATE ON public.monthly_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.monthly_budgets_normalize_month();

-- ---------------------------------------------------------------------------
-- 4. RLS: monthly_budgets
-- ---------------------------------------------------------------------------

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members select monthly_budgets"
  ON public.monthly_budgets FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY "Managers insert monthly_budgets"
  ON public.monthly_budgets FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers update monthly_budgets"
  ON public.monthly_budgets FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  )
  WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "Managers delete monthly_budgets"
  ON public.monthly_budgets FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. Staff cannot edit budget fields on events (managers/admins only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.events_enforce_staff_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage_events(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF (NEW.name IS DISTINCT FROM OLD.name)
    OR (NEW.date IS DISTINCT FROM OLD.date)
    OR (NEW.location IS DISTINCT FROM OLD.location)
    OR (NEW.owner IS DISTINCT FROM OLD.owner)
    OR (NEW.status IS DISTINCT FROM OLD.status)
    OR (NEW.description IS DISTINCT FROM OLD.description)
    OR (NEW.onedrive_link IS DISTINCT FROM OLD.onedrive_link)
    OR (NEW.user_id IS DISTINCT FROM OLD.user_id)
    OR (NEW.attendance IS DISTINCT FROM OLD.attendance)
    OR (NEW.recap_notes IS DISTINCT FROM OLD.recap_notes)
    OR (NEW.sales_estimate IS DISTINCT FROM OLD.sales_estimate)
    OR (NEW.is_archived IS DISTINCT FROM OLD.is_archived)
    OR (NEW.organization_id IS DISTINCT FROM OLD.organization_id)
    OR (NEW.created_at IS DISTINCT FROM OLD.created_at)
    OR (NEW.roi_leads_generated IS DISTINCT FROM OLD.roi_leads_generated)
    OR (NEW.roi_bikes_sold IS DISTINCT FROM OLD.roi_bikes_sold)
    OR (NEW.roi_service_revenue IS DISTINCT FROM OLD.roi_service_revenue)
    OR (NEW.roi_motorclothes_revenue IS DISTINCT FROM OLD.roi_motorclothes_revenue)
    OR (NEW.roi_bike_sales_revenue IS DISTINCT FROM OLD.roi_bike_sales_revenue)
    OR (NEW.roi_event_cost IS DISTINCT FROM OLD.roi_event_cost)
    OR (NEW.event_type IS DISTINCT FROM OLD.event_type)
    OR (NEW.planned_budget IS DISTINCT FROM OLD.planned_budget)
    OR (NEW.actual_budget IS DISTINCT FROM OLD.actual_budget)
  THEN
    RAISE EXCEPTION 'Staff may only toggle live mode; use the checklist to update progress';
  END IF;
  RETURN NEW;
END;
$$;
