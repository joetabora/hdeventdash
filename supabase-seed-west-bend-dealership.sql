-- West Bend Harley-Davidson dealership: new org plus mirrored memberships / roles from Milwaukee.
-- Run AFTER supabase-migration-multi-org-rls.sql
--
-- Assumes Milwaukee is the ORIGINAL dealership org (usually `created_at` first). Existing events stay on that UUID.
--
-- Operational note: Cron /api/cron/push-notifications runs with SUPABASE_SERVICE_ROLE_KEY and evaluates events
-- across every organization — no separate per-org cron is required unless you tighten that job later.

-- ---------------------------------------------------------------------------
-- 1. Name the primary dealership (the org that owns existing events/data)
-- ---------------------------------------------------------------------------

UPDATE public.organizations
SET name = 'Milwaukee Harley-Davidson'
WHERE id = (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE name = 'Milwaukee Harley-Davidson'
  );

-- ---------------------------------------------------------------------------
-- 2. Create West Bend (no events cloned)
-- ---------------------------------------------------------------------------

INSERT INTO public.organizations (name)
SELECT 'West Bend Harley-Davidson'
WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE name = 'West Bend Harley-Davidson'
);

-- ---------------------------------------------------------------------------
-- 3. Memberships & roles — same users as Milwaukee, same RBAC titles
-- ---------------------------------------------------------------------------

INSERT INTO public.organization_members (organization_id, user_id)
SELECT wb.id AS organization_id, m.user_id
FROM public.organization_members m
INNER JOIN public.organizations mk
  ON mk.id = m.organization_id AND mk.name = 'Milwaukee Harley-Davidson'
CROSS JOIN LATERAL (
  SELECT id FROM public.organizations WHERE name = 'West Bend Harley-Davidson' LIMIT 1
) wb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_members om
  WHERE om.user_id = m.user_id AND om.organization_id = wb.id
);

INSERT INTO public.user_roles (user_id, role, organization_id)
SELECT ur.user_id, ur.role, wb.id
FROM public.user_roles ur
INNER JOIN public.organizations mk
  ON mk.id = ur.organization_id AND mk.name = 'Milwaukee Harley-Davidson'
CROSS JOIN LATERAL (
  SELECT id FROM public.organizations WHERE name = 'West Bend Harley-Davidson' LIMIT 1
) wb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles urx
  WHERE urx.user_id = ur.user_id AND urx.organization_id = wb.id
);
