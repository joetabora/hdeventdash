-- Per–checklist-item optional estimated spend (managers only).
-- Counts toward monthly budget together with each event’s planned_budget (see dashboard_aggregates + app budget helpers).
--
-- Apply in order:
--   1) This file (column + RBAC).
--   2) Re-run the full `supabase-migration-dashboard-aggregates.sql` from this repo so `budget_planned`
--      includes sum(checklist estimated_cost). (Greenfield installs already ship that definition.)

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS estimated_cost numeric;

COMMENT ON COLUMN public.checklist_items.estimated_cost IS
  'Optional estimated spend for this line item; summed per event with planned_budget against monthly venue caps.';

-- Staff may not change estimated_cost (same as structure fields: managers only).
CREATE OR REPLACE FUNCTION public.checklist_items_enforce_rbac_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r TEXT;
BEGIN
  r := public.current_app_role();
  IF COALESCE(r, '') NOT IN ('admin', 'manager') THEN
    IF NEW.section IS DISTINCT FROM OLD.section
      OR NEW.label IS DISTINCT FROM OLD.label
      OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
      OR NEW.event_id IS DISTINCT FROM OLD.event_id
      OR NEW.estimated_cost IS DISTINCT FROM OLD.estimated_cost
    THEN
      RAISE EXCEPTION 'Insufficient privileges to modify checklist structure';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
