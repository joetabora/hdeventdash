-- Event Playbook fields: goals and core activities.
-- Run in Supabase SQL Editor after the base events table exists.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_goals text,
  ADD COLUMN IF NOT EXISTS core_activities text;

COMMENT ON COLUMN public.events.event_goals IS
  'Event Purpose & Goals (free-text, from the event playbook template).';

COMMENT ON COLUMN public.events.core_activities IS
  'Core Activities for the event framework (free-text, from the event playbook template).';
