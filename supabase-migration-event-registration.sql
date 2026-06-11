-- Hosted event registration + check-in.
-- Run after supabase-migration-staff-guard-and-swap-meet-rbac.sql.
-- (Requires public.handle_updated_at and public.current_organization_id.)
--
-- Adds:
--   1. events.registration_enabled / registration_capacity / public_slug
--      (public RSVP page lives at /e/<public_slug>)
--   2. event_registrations — attendee RSVPs with party size, confirmation
--      code, and check-in status.
--   3. register_for_event() — SECURITY DEFINER RPC used by the public RSVP
--      API (service role only). Row-locks the event so capacity checks are
--      race-free.
--
-- RLS notes:
--   * Org members can READ registrations for their org's events (drives the
--     attendee list + check-in UI).
--   * There are NO insert/update/delete policies: every write goes through
--     the API (public RSVP via the RPC, check-in via service role after the
--     route verifies org membership). Staff cannot tamper with rows directly.
--   * The staff allowlist trigger on events (is_live_mode only) automatically
--     covers the three new event columns.

-- ---------------------------------------------------------------------------
-- 1. events: registration settings
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registration_capacity INTEGER
    CHECK (registration_capacity IS NULL OR registration_capacity > 0),
  ADD COLUMN IF NOT EXISTS public_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_public_slug
  ON public.events (public_slug)
  WHERE public_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. event_registrations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  party_size INTEGER NOT NULL DEFAULT 1
    CHECK (party_size >= 1 AND party_size <= 20),
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'checked_in', 'cancelled')),
  confirmation_code TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event
  ON public.event_registrations (event_id);

-- One active registration per email per event (cancelled rows don't block
-- re-registering).
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_active_email
  ON public.event_registrations (event_id, email)
  WHERE status <> 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_code
  ON public.event_registrations (event_id, confirmation_code);

DROP TRIGGER IF EXISTS on_event_registrations_updated ON public.event_registrations;
CREATE TRIGGER on_event_registrations_updated
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_registrations_select_org" ON public.event_registrations;
CREATE POLICY "event_registrations_select_org"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. register_for_event RPC (service role only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_slug TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_party_size INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_taken INTEGER;
  v_code TEXT;
  v_reg_id UUID;
BEGIN
  IF p_party_size IS NULL OR p_party_size < 1 OR p_party_size > 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_party_size');
  END IF;
  IF coalesce(trim(p_name), '') = '' OR coalesce(trim(p_email), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- Lock the event row so concurrent RSVPs can't both pass the capacity check.
  SELECT * INTO v_event
  FROM public.events
  WHERE public_slug = lower(trim(p_slug))
    AND registration_enabled
    AND is_archived = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = v_event.id
      AND email = lower(trim(p_email))
      AND status <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_registered');
  END IF;

  IF v_event.registration_capacity IS NOT NULL THEN
    SELECT COALESCE(SUM(party_size), 0) INTO v_taken
    FROM public.event_registrations
    WHERE event_id = v_event.id AND status <> 'cancelled';

    IF v_taken + p_party_size > v_event.registration_capacity THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'capacity',
        'remaining', GREATEST(v_event.registration_capacity - v_taken, 0)
      );
    END IF;
  END IF;

  v_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO public.event_registrations
    (event_id, name, email, phone, party_size, confirmation_code)
  VALUES (
    v_event.id,
    trim(p_name),
    lower(trim(p_email)),
    coalesce(trim(p_phone), ''),
    p_party_size,
    v_code
  )
  RETURNING id INTO v_reg_id;

  RETURN jsonb_build_object(
    'ok', true,
    'registration_id', v_reg_id,
    'confirmation_code', v_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_event(TEXT, TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_for_event(TEXT, TEXT, TEXT, TEXT, INTEGER)
  TO service_role;
