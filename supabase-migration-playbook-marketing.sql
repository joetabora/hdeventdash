-- Playbook marketing JSON on events + org-level default art form URL.
-- Run in Supabase SQL Editor after core schema / organizations migration.
--
-- Default checklist rows for *new* events come from `create_event_with_checklist`.
-- If that RPC was already applied, re-run the latest
-- `supabase-migration-create-event-with-checklist-rpc.sql` so new events pick up
-- the website/Facebook SOP lines aligned with `DEFAULT_CHECKLIST_ITEMS` in the app.
-- Existing events keep their checklist rows unchanged.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS playbook_marketing jsonb;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS marketing_art_form_url text;

COMMENT ON COLUMN public.events.playbook_marketing IS
  'Marketing/publishing JSON: engagement goal, SPM dates, asset requests, web/FB copy, Canva checkpoints.';

COMMENT ON COLUMN public.organizations.marketing_art_form_url IS
  'Default SPM/art request form URL; per-event override in events.playbook_marketing JSON.';
