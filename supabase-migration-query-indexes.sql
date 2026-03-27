-- Indexes for common filters and joins. Safe to re-run (IF NOT EXISTS).
-- Requires: organizations migration (events.organization_id), base schema
-- (checklist_items), and vendors migration (event_vendors).

-- Org-scoped listings and date ranges (dashboard, calendar).
CREATE INDEX IF NOT EXISTS idx_events_organization_id_date
  ON public.events(organization_id, date);

-- Cron push: upcoming non-terminal events only (narrow scan vs full table).
CREATE INDEX IF NOT EXISTS idx_events_push_notification_scan
  ON public.events (date)
  WHERE is_archived = false
    AND status NOT IN ('completed', 'live_event');

-- Checklist loads and batch stats by event (matches supabase-schema.sql name).
CREATE INDEX IF NOT EXISTS idx_checklist_event_id
  ON public.checklist_items(event_id);

-- Vendor participation history: filter by vendor_id (same name as vendors migration).
CREATE INDEX IF NOT EXISTS idx_event_vendors_vendor
  ON public.event_vendors(vendor_id);
