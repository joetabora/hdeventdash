-- Role-based access: admin (full), manager (events + files + comments), staff (checklist progress only).
-- Run in Supabase SQL Editor after supabase-migration-organizations.sql.

-- ---------------------------------------------------------------------------
-- 1. Allow "manager" role
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'manager', 'staff'));

-- ---------------------------------------------------------------------------
-- 2. Role helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  INNER JOIN public.organization_members om
    ON om.user_id = ur.user_id AND om.organization_id = ur.organization_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_events(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.organization_members om
      ON om.user_id = ur.user_id AND om.organization_id = ur.organization_id
    WHERE ur.user_id = uid
      AND ur.role IN ('admin', 'manager')
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Checklist: non-managers may only change progress fields
-- ---------------------------------------------------------------------------

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
    THEN
      RAISE EXCEPTION 'Insufficient privileges to modify checklist structure';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_items_rbac ON public.checklist_items;
CREATE TRIGGER trg_checklist_items_rbac
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.checklist_items_enforce_rbac_update();

-- ---------------------------------------------------------------------------
-- 4. Events: only admin/manager may write; only admin may delete
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org members insert events" ON public.events;
DROP POLICY IF EXISTS "Org members update events" ON public.events;
DROP POLICY IF EXISTS "Delete own events in org" ON public.events;

CREATE POLICY "Managers insert events in org"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND auth.uid() = user_id
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers update events in org"
  ON public.events FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.can_manage_events(auth.uid())
  )
  WITH CHECK (organization_id = public.current_organization_id());

-- Staff may UPDATE rows only to toggle is_live_mode (enforced by trigger below).
CREATE POLICY "Staff update events in org"
  ON public.events FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND COALESCE(public.current_app_role(), '') = 'staff'
  )
  WITH CHECK (organization_id = public.current_organization_id());

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
  THEN
    RAISE EXCEPTION 'Staff may only toggle live mode; use the checklist to update progress';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_rbac_staff ON public.events;
CREATE TRIGGER trg_events_rbac_staff
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_enforce_staff_update();

CREATE POLICY "Admins delete events in org"
  ON public.events FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_organization_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. Checklist rows: insert/delete for managers only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org insert checklist" ON public.checklist_items;
DROP POLICY IF EXISTS "Org delete checklist" ON public.checklist_items;

CREATE POLICY "Managers insert checklist"
  ON public.checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checklist_items.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers delete checklist"
  ON public.checklist_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checklist_items.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 6. Documents & media: mutating ops for managers only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org insert documents" ON public.event_documents;
DROP POLICY IF EXISTS "Org delete documents" ON public.event_documents;
DROP POLICY IF EXISTS "Org insert media" ON public.event_media;
DROP POLICY IF EXISTS "Org delete media" ON public.event_media;

CREATE POLICY "Managers insert documents"
  ON public.event_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_documents.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers delete documents"
  ON public.event_documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_documents.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers insert media"
  ON public.event_media FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_media.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Managers delete media"
  ON public.event_media FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_media.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 7. Comments: post/delete for managers only (staff read-only)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org insert comments" ON public.event_comments;
DROP POLICY IF EXISTS "Org delete own comments" ON public.event_comments;

CREATE POLICY "Managers insert comments"
  ON public.event_comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND public.can_manage_events(auth.uid())
    AND auth.uid() = user_id
  );

CREATE POLICY "Managers delete comments"
  ON public.event_comments FOR DELETE TO authenticated
  USING (
    public.can_manage_events(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Storage: upload/delete for managers only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Org delete documents" ON storage.objects;

CREATE POLICY "Org upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = public.current_organization_id()::text
    AND public.can_manage_events(auth.uid())
  );

CREATE POLICY "Org delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = public.current_organization_id()::text
    AND public.can_manage_events(auth.uid())
  );
