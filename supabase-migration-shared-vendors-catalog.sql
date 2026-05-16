-- Shared vendor directory: all dealerships use one `organization_id` on public.vendors.
-- Run in Supabase SQL Editor after supabase-migration-vendors.sql (and multi-org RLS).
--
-- App constant: src/lib/shared-vendors-org.ts (must match shared_vendors_organization_id()).

CREATE OR REPLACE FUNCTION public.shared_vendors_organization_id()
RETURNS uuid
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'c0ffee00-0000-4000-8000-000000000001'::uuid;
$$;

INSERT INTO public.organizations (id, name)
VALUES (
  public.shared_vendors_organization_id(),
  'Shared vendor directory (all dealerships)'
)
ON CONFLICT (id) DO NOTHING;

-- Point existing vendor rows at the shared org (single pool for every dealership).
UPDATE public.vendors
SET organization_id = public.shared_vendors_organization_id()
WHERE organization_id IS DISTINCT FROM public.shared_vendors_organization_id();

-- Always stamp new vendors to the shared catalog (ignores JWT current org).
CREATE OR REPLACE FUNCTION public.vendors_set_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.organization_id := public.shared_vendors_organization_id();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS: vendors — anyone with a dealership membership can read; managers (active org) can write
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org members select vendors" ON public.vendors;
DROP POLICY IF EXISTS "Members select shared vendor directory" ON public.vendors;

CREATE POLICY "Members select shared vendor directory"
  ON public.vendors FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers insert shared vendors" ON public.vendors;

CREATE POLICY "Managers insert shared vendors"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_events(auth.uid())
    AND organization_id = public.shared_vendors_organization_id()
  );

DROP POLICY IF EXISTS "Managers update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers update shared vendors" ON public.vendors;

CREATE POLICY "Managers update shared vendors"
  ON public.vendors FOR UPDATE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND organization_id = public.shared_vendors_organization_id()
  )
  WITH CHECK (organization_id = public.shared_vendors_organization_id());

DROP POLICY IF EXISTS "Managers delete vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers delete shared vendors" ON public.vendors;

CREATE POLICY "Managers delete shared vendors"
  ON public.vendors FOR DELETE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND organization_id = public.shared_vendors_organization_id()
  );

-- ---------------------------------------------------------------------------
-- RLS: event_vendors — vendor must be shared-catalog; event must be in active org
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org select event_vendors" ON public.event_vendors;

CREATE POLICY "Org select event_vendors"
  ON public.event_vendors FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v ON v.id = event_vendors.vendor_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
        AND v.organization_id = public.shared_vendors_organization_id()
    )
  );

DROP POLICY IF EXISTS "Managers insert event_vendors" ON public.event_vendors;

CREATE POLICY "Managers insert event_vendors"
  ON public.event_vendors FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v ON v.id = event_vendors.vendor_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
        AND v.organization_id = public.shared_vendors_organization_id()
    )
  );

DROP POLICY IF EXISTS "Managers update event_vendors" ON public.event_vendors;

CREATE POLICY "Managers update event_vendors"
  ON public.event_vendors FOR UPDATE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v ON v.id = event_vendors.vendor_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
        AND v.organization_id = public.shared_vendors_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v ON v.id = event_vendors.vendor_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
        AND v.organization_id = public.shared_vendors_organization_id()
    )
  );

DROP POLICY IF EXISTS "Managers delete event_vendors" ON public.event_vendors;

CREATE POLICY "Managers delete event_vendors"
  ON public.event_vendors FOR DELETE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.events e
      INNER JOIN public.vendors v ON v.id = event_vendors.vendor_id
      WHERE e.id = event_vendors.event_id
        AND e.organization_id = public.current_organization_id()
        AND v.organization_id = public.shared_vendors_organization_id()
    )
  );

COMMENT ON FUNCTION public.shared_vendors_organization_id() IS
  'All public.vendors rows use this organization_id so every dealership shares one directory; do not delete this organizations row.';
