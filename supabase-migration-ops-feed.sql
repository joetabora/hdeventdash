-- Ops Feed: org-scoped operational memory / daily dump for event staff.
-- Run in Supabase SQL Editor after organization + RBAC migrations
-- (requires public.current_organization_id, public.can_manage_events,
--  and public.handle_updated_at).

-- ---------------------------------------------------------------------------
-- 1. Ops feed entries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ops_feed_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'note'
    CHECK (entry_type IN (
      'note',
      'idea',
      'call',
      'vendor',
      'sponsor',
      'reminder',
      'issue',
      'improvement',
      'staffing',
      'marketing',
      'social'
    )),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'resolved'))
);

COMMENT ON TABLE public.ops_feed_entries IS
  'Operational feed / daily dump — ideas, call notes, reminders, and issues for event staff.';

CREATE INDEX IF NOT EXISTS idx_ops_feed_entries_org_created
  ON public.ops_feed_entries(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_feed_entries_event
  ON public.ops_feed_entries(event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ops_feed_entries_status
  ON public.ops_feed_entries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_ops_feed_entries_tags
  ON public.ops_feed_entries USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_ops_feed_entries_priority
  ON public.ops_feed_entries(organization_id, priority);

-- ---------------------------------------------------------------------------
-- 2. Triggers: organization_id, event org match, updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ops_feed_entries_set_organization()
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

CREATE OR REPLACE FUNCTION public.ops_feed_entries_validate_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_org UUID;
BEGIN
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT e.organization_id INTO event_org
  FROM public.events e
  WHERE e.id = NEW.event_id;
  IF event_org IS NULL THEN
    RAISE EXCEPTION 'Linked event not found';
  END IF;
  IF event_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Linked event does not belong to your organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ops_feed_entries_set_organization ON public.ops_feed_entries;
CREATE TRIGGER trg_ops_feed_entries_set_organization
  BEFORE INSERT ON public.ops_feed_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.ops_feed_entries_set_organization();

DROP TRIGGER IF EXISTS trg_ops_feed_entries_validate_event ON public.ops_feed_entries;
CREATE TRIGGER trg_ops_feed_entries_validate_event
  BEFORE INSERT OR UPDATE OF event_id, organization_id ON public.ops_feed_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.ops_feed_entries_validate_event();

DROP TRIGGER IF EXISTS on_ops_feed_entries_updated ON public.ops_feed_entries;
CREATE TRIGGER on_ops_feed_entries_updated
  BEFORE UPDATE ON public.ops_feed_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS — all org members can read/write (operational capture for staff)
-- ---------------------------------------------------------------------------

ALTER TABLE public.ops_feed_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members select ops feed"
  ON public.ops_feed_entries FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY "Org members insert ops feed"
  ON public.ops_feed_entries FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Org members update ops feed"
  ON public.ops_feed_entries FOR UPDATE TO authenticated
  USING (organization_id = public.current_organization_id())
  WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "Org members delete ops feed"
  ON public.ops_feed_entries FOR DELETE TO authenticated
  USING (organization_id = public.current_organization_id());
