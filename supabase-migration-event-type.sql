-- Optional event type for analytics (segment performance).
-- Run after supabase-migration-event-roi.sql (extends staff update guard).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (
    event_type IS NULL
    OR event_type IN (
      'ride',
      'open_house',
      'demo_day',
      'community',
      'sales_promo',
      'fundraiser',
      'other'
    )
  );

COMMENT ON COLUMN public.events.event_type IS 'Category for analytics (rides, open houses, etc.)';

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
  THEN
    RAISE EXCEPTION 'Staff may only toggle live mode; use the checklist to update progress';
  END IF;
  RETURN NEW;
END;
$$;
