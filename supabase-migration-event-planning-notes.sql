-- Scratch-pad notes for event planning (separate from post-event recap_notes).
-- Run in Supabase SQL Editor after the base events table exists.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS planning_notes text;

COMMENT ON COLUMN public.events.planning_notes IS
  'Free-form planning scratch pad (meeting notes, ideas) while coordinating the event.';
