-- Playbook workflow JSON + optional event time labels (create wizard / detail).
-- Run after playbook_marketing migration or on fresh DB.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_time_start text,
  ADD COLUMN IF NOT EXISTS event_time_end text,
  ADD COLUMN IF NOT EXISTS playbook_workflow jsonb;

COMMENT ON COLUMN public.events.event_time_start IS 'Display start time for the event (free text).';
COMMENT ON COLUMN public.events.event_time_end IS 'Display end time for the event (free text).';
COMMENT ON COLUMN public.events.playbook_workflow IS 'Full playbook: framework line costs, pre-event flags, copy prompts, materials grid, roles, etc.';
