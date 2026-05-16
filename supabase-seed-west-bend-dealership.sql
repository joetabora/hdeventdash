-- West Bend Harley-Davidson dealership: new org plus mirrored memberships / roles from Milwaukee.
-- Run AFTER supabase-migration-multi-org-rls.sql (see that file for full production run order).
--
-- Assumes Milwaukee is the ORIGINAL dealership org (usually `created_at` first). Existing events stay on that UUID.
-- This script does NOT copy events, monthly_budgets, vendors, or media — West Bend starts empty for those tables.
--
-- Operational note: Cron /api/cron/push-notifications runs with SUPABASE_SERVICE_ROLE_KEY and evaluates events
-- across every organization — no separate per-org cron is required unless you tighten that job later.
--
-- ---------------------------------------------------------------------------
-- POST-DEPLOY VERIFICATION (run as postgres / service role or Table Editor)
--   - Two org names:
--       SELECT id, name FROM public.organizations ORDER BY created_at;
--   - Each former single-org user has two membership rows (example for one email):
--       SELECT u.email, o.name, om.created_at
--       FROM public.organization_members om
--       JOIN auth.users u ON u.id = om.user_id
--       JOIN public.organizations o ON o.id = om.organization_id
--       WHERE u.email = 'you@example.com'
--       ORDER BY o.name;
--   - West Bend has zero events until you create them:
--       SELECT COUNT(*) FROM public.events e
--       JOIN public.organizations o ON o.id = e.organization_id
--       WHERE o.name = 'West Bend Harley-Davidson';
--   - In the app: Sidebar "Switch dealership" → West Bend → Kanban/Budget/Vendors empty;
--     switch back → Milwaukee data unchanged.
-- ---------------------------------------------------------------------------

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
