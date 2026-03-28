-- Atomic create event + default checklist items (single transaction).
-- Run in Supabase SQL Editor after organization + RLS migrations
-- (requires public.events, public.checklist_items, trg_events_set_organization).

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
  p_actual_budget numeric DEFAULT NULL
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
    actual_budget
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
    p_actual_budget
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
      ('Booking & Logistics'::text, 'Entertainment/Music'::text, 0),
      ('Booking & Logistics', 'Catering/food vendor', 1),
      ('Booking & Logistics', 'Merchant vendor', 2),
      ('Booking & Logistics', 'Decor/Misc Materials', 3),
      ('Marketing & Promotion', 'Event flyer/graphics created', 0),
      ('Marketing & Promotion', 'Social media posts scheduled', 1),
      ('Marketing & Promotion', 'Email blast sent to mailing list', 2),
      ('Marketing & Promotion', 'Local media/press outreach done', 3),
      ('Marketing & Promotion', 'Signage and banners prepared', 4),
      ('Marketing & Promotion', 'Website/landing page updated', 5),
      ('Internal Alignment', 'Staff roles and shifts assigned', 0),
      ('Internal Alignment', 'Pre-event team meeting scheduled', 1),
      ('Internal Alignment', 'Volunteer coordination complete', 2),
      ('Internal Alignment', 'Emergency/safety plan reviewed', 3),
      ('Internal Alignment', 'Communication channels set up', 4),
      ('Sales & Experience', 'Product inventory prepared', 0),
      ('Sales & Experience', 'POS/payment systems tested', 1),
      ('Sales & Experience', 'Demo bikes/products staged', 2),
      ('Sales & Experience', 'Customer experience flow mapped', 3),
      ('Sales & Experience', 'Giveaways/swag prepared', 4),
      ('Sales & Experience', 'Follow-up plan for leads defined', 5)
  ) AS x(section, label, sort_order);

  RETURN v_event;
END;
$$;

COMMENT ON FUNCTION public.create_event_with_checklist IS
  'Creates an event and default checklist rows in one transaction; rolls back on any failure.';

REVOKE ALL ON FUNCTION public.create_event_with_checklist(
  text, date, text, text, text, text, text, uuid, text, numeric, numeric
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_event_with_checklist(
  text, date, text, text, text, text, text, uuid, text, numeric, numeric
) TO authenticated;
