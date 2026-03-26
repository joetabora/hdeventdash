-- Multi-tenant organizations: run in Supabase SQL Editor after main schema, roles, and push migrations.
-- Backs up existing data into a default org and tightens RLS + storage paths.

-- ---------------------------------------------------------------------------
-- 1. Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- ---------------------------------------------------------------------------
-- 2. Default org + backfill membership for every existing auth user
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1);

INSERT INTO public.organization_members (organization_id, user_id)
SELECT (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1), u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members m WHERE m.user_id = u.id
);

-- ---------------------------------------------------------------------------
-- 3. Events: organization scope
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.events e
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
WHERE e.organization_id IS NULL;

ALTER TABLE public.events
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);

-- ---------------------------------------------------------------------------
-- 4. user_roles: scope to organization
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.user_roles ur
SET organization_id = (
  SELECT m.organization_id FROM public.organization_members m WHERE m.user_id = ur.user_id LIMIT 1
)
WHERE ur.organization_id IS NULL;

ALTER TABLE public.user_roles
  ALTER COLUMN organization_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Storage path prefix in DB (org/event/...) — move bucket objects manually if needed
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  oid TEXT;
BEGIN
  SELECT id::text INTO oid FROM public.organizations ORDER BY created_at LIMIT 1;
  UPDATE public.event_documents
  SET file_path = oid || '/' || file_path
  WHERE file_path IS NOT NULL AND NOT (file_path LIKE oid || '/%');

  UPDATE public.event_media
  SET file_path = oid || '/' || file_path
  WHERE file_path IS NOT NULL AND NOT (file_path LIKE oid || '/%');
END $$;

-- ---------------------------------------------------------------------------
-- 6. Helper functions (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_organization_admin(uid UUID)
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
    WHERE ur.user_id = uid AND ur.role = 'admin'
  );
$$;

-- Keep existing name used by policies / app
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_organization_admin(check_user_id);
$$;

-- ---------------------------------------------------------------------------
-- 7. Event organization guard (optional client still sends org_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.events_set_organization()
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

DROP TRIGGER IF EXISTS trg_events_set_organization ON public.events;
CREATE TRIGGER trg_events_set_organization
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_set_organization();

-- ---------------------------------------------------------------------------
-- 8. Drop old RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view all events" ON public.events;
DROP POLICY IF EXISTS "Users can insert events" ON public.events;
DROP POLICY IF EXISTS "Users can update events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

DROP POLICY IF EXISTS "Users can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can insert checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can update checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can delete checklist items" ON public.checklist_items;

DROP POLICY IF EXISTS "Users can view documents" ON public.event_documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.event_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON public.event_documents;

DROP POLICY IF EXISTS "Users can view media" ON public.event_media;
DROP POLICY IF EXISTS "Users can insert media" ON public.event_media;
DROP POLICY IF EXISTS "Users can delete media" ON public.event_media;

DROP POLICY IF EXISTS "Users can view comments" ON public.event_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.event_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.event_comments;

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- ---------------------------------------------------------------------------
-- 9. Organizations + members RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read members in same organization"
  ON public.organization_members FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY "Org admins insert members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_organization_admin(auth.uid())
  );

CREATE POLICY "Org admins delete members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_organization_admin(auth.uid())
    AND user_id <> auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 10. Events RLS (strict org isolation)
-- ---------------------------------------------------------------------------

CREATE POLICY "Org members select events"
  ON public.events FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY "Org members insert events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND auth.uid() = user_id
  );

CREATE POLICY "Org members update events"
  ON public.events FOR UPDATE TO authenticated
  USING (organization_id = public.current_organization_id())
  WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "Delete own events in org"
  ON public.events FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND auth.uid() = user_id
  );

-- ---------------------------------------------------------------------------
-- 11. Child tables via event → organization
-- ---------------------------------------------------------------------------

CREATE POLICY "Org select checklist"
  ON public.checklist_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checklist_items.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org insert checklist"
  ON public.checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checklist_items.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org update checklist"
  ON public.checklist_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checklist_items.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org delete checklist"
  ON public.checklist_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checklist_items.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org select documents"
  ON public.event_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_documents.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org insert documents"
  ON public.event_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_documents.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org delete documents"
  ON public.event_documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_documents.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org select media"
  ON public.event_media FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_media.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org insert media"
  ON public.event_media FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_media.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org delete media"
  ON public.event_media FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_media.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org select comments"
  ON public.event_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "Org insert comments"
  ON public.event_comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.organization_id = public.current_organization_id()
    )
    AND auth.uid() = user_id
  );

CREATE POLICY "Org delete own comments"
  ON public.event_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND e.organization_id = public.current_organization_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 12. user_roles (same organization only)
-- ---------------------------------------------------------------------------

CREATE POLICY "Read roles in organization"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      organization_id = public.current_organization_id()
      AND public.is_organization_admin(auth.uid())
    )
  );

CREATE POLICY "Admins insert roles in org"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.is_organization_admin(auth.uid())
  );

CREATE POLICY "Admins update roles in org"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_organization_admin(auth.uid())
  );

CREATE POLICY "Admins delete roles in org"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_organization_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 13. Storage: first path segment must equal organization id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

CREATE POLICY "Org upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = public.current_organization_id()::text
  );

CREATE POLICY "Org read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = public.current_organization_id()::text
  );

CREATE POLICY "Org delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-documents'
    AND (storage.foldername(name))[1] = public.current_organization_id()::text
  );
