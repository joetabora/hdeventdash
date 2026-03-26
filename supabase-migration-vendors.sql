-- Vendors: org-scoped directory, event attachments, participation tracking.
-- Run in Supabase SQL Editor after organization + RBAC migrations
-- (requires public.can_manage_events and public.handle_updated_at).

-- ---------------------------------------------------------------------------
-- 1. Vendors master table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_organization_id ON public.vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(organization_id, lower(name));

-- ---------------------------------------------------------------------------
-- 2. Event ↔ vendor links (history kept via detached_at)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT '',
  participation_status TEXT NOT NULL DEFAULT 'invited'
    CHECK (participation_status IN (
      'invited',
      'confirmed',
      'participated',
      'declined',
      'cancelled'
    )),
  notes TEXT NOT NULL DEFAULT '',
  detached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_event_vendors_event ON public.event_vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_vendor ON public.event_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_active
  ON public.event_vendors(event_id)
  WHERE detached_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Triggers: organization_id + updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vendors_set_organization()
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

DROP TRIGGER IF EXISTS trg_vendors_set_organization ON public.vendors;
CREATE TRIGGER trg_vendors_set_organization
  BEFORE INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.vendors_set_organization();

DROP TRIGGER IF EXISTS on_vendors_updated ON public.vendors;
CREATE TRIGGER on_vendors_updated
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_event_vendors_updated ON public.event_vendors;
CREATE TRIGGER on_event_vendors_updated
  BEFORE UPDATE ON public.event_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members select vendors"
  ON public.vendors FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY "Managers insert vendors"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers update vendors"
  ON public.vendors FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  )
  WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "Managers delete vendors"
  ON public.vendors FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  );

ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select event_vendors"
  ON public.event_vendors FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v
        ON v.id = event_vendors.vendor_id
       AND v.organization_id = e.organization_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Managers insert event_vendors"
  ON public.event_vendors FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v
        ON v.id = event_vendors.vendor_id
       AND v.organization_id = e.organization_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Managers update event_vendors"
  ON public.event_vendors FOR UPDATE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v
        ON v.id = event_vendors.vendor_id
       AND v.organization_id = e.organization_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v
        ON v.id = event_vendors.vendor_id
       AND v.organization_id = e.organization_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Managers delete event_vendors"
  ON public.event_vendors FOR DELETE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v
        ON v.id = event_vendors.vendor_id
       AND v.organization_id = e.organization_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );
