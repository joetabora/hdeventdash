-- Security hardening: staff event-update allowlist + swap meet RBAC.
-- Run after supabase-migration-budgets.sql (which last replaced
-- events_enforce_staff_update) and supabase-migration-workflow-enhancements.sql
-- (which created swap_meet_spots).
--
-- 1. events_enforce_staff_update previously blocked a hard-coded list of
--    columns. Columns added later (planning_notes, event_goals, core_activities,
--    giveaway/RSVP fields, has_swap_meet, playbook_workflow, playbook_marketing,
--    event_time_start/end, location_key, ...) were never added to that list, so
--    staff calling Supabase directly could edit them. This replaces the
--    blocklist with an ALLOWLIST: staff may only change is_live_mode. Any
--    column added to events in the future is blocked for staff by default.
--
-- 2. swap_meet_spots write policies had no role check — any org member could
--    insert/update/delete spots. The API already requires manager/admin; this
--    aligns RLS with it (same pattern as documents/media/checklist structure).

-- ---------------------------------------------------------------------------
-- 1. Staff event updates: allowlist (is_live_mode only)
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
  -- Compare full rows minus the columns staff are allowed to change.
  -- updated_at is excluded because on_events_updated (BEFORE UPDATE, fires
  -- earlier alphabetically) bumps it before this trigger runs.
  IF (to_jsonb(NEW) - 'is_live_mode' - 'updated_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'is_live_mode' - 'updated_at')
  THEN
    RAISE EXCEPTION 'Staff may only toggle live mode; use the checklist to update progress';
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create the trigger idempotently (no-op if it already points at the function).
DROP TRIGGER IF EXISTS trg_events_rbac_staff ON public.events;
CREATE TRIGGER trg_events_rbac_staff
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_enforce_staff_update();

-- ---------------------------------------------------------------------------
-- 2. swap_meet_spots: writes require manager/admin (reads stay org-wide)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "swap_meet_spots_insert_org" ON public.swap_meet_spots;
DROP POLICY IF EXISTS "swap_meet_spots_update_org" ON public.swap_meet_spots;
DROP POLICY IF EXISTS "swap_meet_spots_delete_org" ON public.swap_meet_spots;

CREATE POLICY "swap_meet_spots_insert_org"
  ON public.swap_meet_spots FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "swap_meet_spots_update_org"
  ON public.swap_meet_spots FOR UPDATE TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  )
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "swap_meet_spots_delete_org"
  ON public.swap_meet_spots FOR DELETE TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );
