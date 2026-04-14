-- Atomic create event + default checklist items (single transaction).
-- Run in Supabase SQL Editor after organization + RLS migrations
-- (requires public.events, public.checklist_items, trg_events_set_organization).

-- Drop the old 11-param signature so PostgreSQL doesn't see two overloads.
DROP FUNCTION IF EXISTS public.create_event_with_checklist(
  text, date, text, text, text, text, text, uuid, text, numeric, numeric
);

CREATE OR REPLACE FUNCTION public.create_event_with_checklist(
  p_name text,
  p_date date,
  p_location text,
  p_owner text,
  p_status text,
  p_description text,
  p_onedrive_link text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_planned_budget numeric DEFAULT NULL,
  p_actual_budget numeric DEFAULT NULL,
  p_event_goals text DEFAULT NULL,
  p_core_activities text DEFAULT NULL
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_event public.events;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'user_id must match the authenticated user';
  END IF;

  INSERT INTO public.events (
    name,
    date,
    location,
    owner,
    status,
    description,
    onedrive_link,
    user_id,
    event_type,
    planned_budget,
    actual_budget,
    event_goals,
    core_activities
  )
  VALUES (
    p_name,
    p_date,
    COALESCE(NULLIF(trim(p_location), ''), ''),
    COALESCE(NULLIF(trim(p_owner), ''), ''),
    p_status,
    COALESCE(NULLIF(trim(p_description), ''), ''),
    NULLIF(trim(p_onedrive_link), ''),
    v_uid,
    p_event_type,
    p_planned_budget,
    p_actual_budget,
    NULLIF(trim(p_event_goals), ''),
    NULLIF(trim(p_core_activities), '')
  )
  RETURNING * INTO v_event;

  INSERT INTO public.checklist_items (event_id, section, label, sort_order)
  SELECT
    v_event.id,
    x.section,
    x.label,
    x.sort_order
  FROM (
    VALUES
      -- Pre-Event Preparation
      ('Pre-Event Preparation'::text, 'Finalize theme & core activities'::text, 0),
      ('Pre-Event Preparation', 'Secure outside vendors (food truck, band, charity, etc.)', 1),
      ('Pre-Event Preparation', 'Entertainment/Music booked', 2),
      ('Pre-Event Preparation', 'Catering/food vendor confirmed', 3),
      ('Pre-Event Preparation', 'Merchant vendor confirmed', 4),
      ('Pre-Event Preparation', 'Decor/Misc materials sourced', 5),
      ('Pre-Event Preparation', 'Permits/approvals submitted (food, music, raffles)', 6),
      ('Pre-Event Preparation', 'Request marketing assets from Chryssi/SPM (dates, details, media types)', 7),
      ('Pre-Event Preparation', 'Flyer created (print & digital)', 8),
      ('Pre-Event Preparation', 'Social media graphics created (FB/IG, stories, reels)', 9),
      ('Pre-Event Preparation', 'CRM email segment prepared', 10),
      ('Pre-Event Preparation', 'Website event listing updated with SEO description', 11),
      ('Pre-Event Preparation', 'Share event details with team managers', 12),
      ('Pre-Event Preparation', 'Assign staff roles (grill, games, raffles, etc.)', 13),
      ('Pre-Event Preparation', 'Create layout (indoor/outdoor) and present to managers', 14),
      -- Checklist / Materials
      ('Checklist / Materials', 'Tent', 0),
      ('Checklist / Materials', 'Tables', 1),
      ('Checklist / Materials', 'Tablecloths', 2),
      ('Checklist / Materials', 'Chairs', 3),
      ('Checklist / Materials', 'FB graphic (1200×1200) posted', 4),
      ('Checklist / Materials', 'IG graphic (1080×1920) posted', 5),
      ('Checklist / Materials', 'Web banner', 6),
      ('Checklist / Materials', 'Email graphic', 7),
      ('Checklist / Materials', 'Email script', 8),
      ('Checklist / Materials', 'Phone script', 9),
      ('Checklist / Materials', 'Text script', 10),
      ('Checklist / Materials', 'Text blast sent', 11),
      ('Checklist / Materials', 'Motorcycle staged', 12),
      ('Checklist / Materials', 'Flyers printed', 13),
      ('Checklist / Materials', 'Bounce back cash', 14),
      ('Checklist / Materials', 'Giveaway keyword set up', 15),
      ('Checklist / Materials', 'Giveaway item', 16),
      ('Checklist / Materials', 'Other swag', 17),
      ('Checklist / Materials', 'iPad', 18),
      ('Checklist / Materials', 'Poster sign/holder', 19),
      ('Checklist / Materials', 'Guitar', 20),
      ('Checklist / Materials', 'Balloons', 21),
      ('Checklist / Materials', 'Flags', 22),
      -- Event Week Flow
      ('Event Week Flow', 'Monday: Post ''This Week at HD'' teaser on socials', 0),
      ('Event Week Flow', 'Tuesday: Send CRM email blast', 1),
      ('Event Week Flow', 'Tuesday: Place catering/DoorDash orders', 2),
      ('Event Week Flow', 'Wednesday: Push mid-week teaser (''3 Days Away!'')', 3),
      ('Event Week Flow', 'Friday: ''Happening Tomorrow'' post + reminder email', 4),
      ('Event Week Flow', 'Friday: Confirm vendors and deliveries', 5),
      ('Event Week Flow', 'Friday: Prepare prize, table & signage', 6),
      ('Event Week Flow', 'Saturday setup: Tents', 7),
      ('Event Week Flow', 'Saturday setup: Grill', 8),
      ('Event Week Flow', 'Saturday setup: Tables & signage', 9),
      ('Event Week Flow', 'Saturday setup: Prize entry station', 10),
      ('Event Week Flow', 'Saturday: Staff reminders sent', 11),
      ('Event Week Flow', 'Saturday: Capture photo/video content', 12),
      -- Post-Event Follow-Up
      ('Post-Event Follow-Up', 'Within 24h: Post event photos/videos (''Thanks for riding out!'')', 0),
      ('Post-Event Follow-Up', 'Within 24h: Collect raffle entries & track leads in CRM', 1),
      ('Post-Event Follow-Up', 'Within 3 days: Send follow-up email (thanks + promote next event)', 2),
      ('Post-Event Follow-Up', 'Manager meeting: Share recap (attendance, leads, sales impact)', 3),
      -- Roles & Responsibilities
      ('Roles & Responsibilities', 'Marketing lead assigned', 0),
      ('Roles & Responsibilities', 'Sales team roles assigned', 1),
      ('Roles & Responsibilities', 'Service team roles assigned', 2),
      ('Roles & Responsibilities', 'MotorClothes team roles assigned', 3),
      ('Roles & Responsibilities', 'GM/Owner briefed', 4),
      ('Roles & Responsibilities', 'Volunteers/charities confirmed', 5),
      -- Metrics for Success
      ('Metrics for Success', 'Event attendance (foot traffic) recorded', 0),
      ('Metrics for Success', 'Leads captured (entries/keywords collected)', 1),
      ('Metrics for Success', 'Sales lift tracked (MotorClothes, Parts, Sales during event)', 2),
      ('Metrics for Success', 'Social media engagement reviewed (reach, comments, shares)', 3),
      ('Metrics for Success', 'Customer feedback collected', 4)
  ) AS x(section, label, sort_order);

  RETURN v_event;
END;
$$;

COMMENT ON FUNCTION public.create_event_with_checklist IS
  'Creates an event and default checklist rows in one transaction; rolls back on any failure.';

REVOKE ALL ON FUNCTION public.create_event_with_checklist(
  text, date, text, text, text, text, text, uuid, text, numeric, numeric, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_event_with_checklist(
  text, date, text, text, text, text, text, uuid, text, numeric, numeric, text, text
) TO authenticated;
