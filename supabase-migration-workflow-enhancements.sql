-- Event Workflow Enhancements Migration
-- Run in Supabase SQL Editor after existing migrations.
-- Covers: vendor fees, event promotions, swap meet spots, document tags.

-- 1. Vendor Fee Tracking
ALTER TABLE public.event_vendors
  ADD COLUMN IF NOT EXISTS agreed_fee numeric,
  ADD COLUMN IF NOT EXISTS fee_notes text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.event_vendors.agreed_fee IS
  'Agreed fee / cost for this vendor at this event.';
COMMENT ON COLUMN public.event_vendors.fee_notes IS
  'Fee option notes (e.g. "with sound: $800 / without: $500").';

-- 2. Swap Meet opt-in flag
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS has_swap_meet boolean NOT NULL DEFAULT false;

-- 3. Event Promotion Fields
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS giveaway_description text,
  ADD COLUMN IF NOT EXISTS giveaway_link text,
  ADD COLUMN IF NOT EXISTS rsvp_incentive text,
  ADD COLUMN IF NOT EXISTS rsvp_link text;

COMMENT ON COLUMN public.events.giveaway_description IS
  'Giveaway / raffle description (e.g. "Win a $500 gift card via QR code").';
COMMENT ON COLUMN public.events.giveaway_link IS
  'Link to giveaway / QR code entry site (e.g. Mixer).';
COMMENT ON COLUMN public.events.rsvp_incentive IS
  'RSVP incentive description (e.g. "First 30 to RSVP get free food").';
COMMENT ON COLUMN public.events.rsvp_link IS
  'Link to RSVP site.';

-- 3. Document Tags: widen the CHECK constraint
-- Drop existing constraint (name varies; use ALTER COLUMN SET + new CHECK)
ALTER TABLE public.event_documents DROP CONSTRAINT IF EXISTS event_documents_tag_check;
ALTER TABLE public.event_documents
  ADD CONSTRAINT event_documents_tag_check
  CHECK (tag IN ('contract', 'invoice', 'flyer', 'photo', 'receipt', 'w9', 'liability_waiver', 'layout', 'other'));

-- 4. Swap Meet Spots table
CREATE TABLE IF NOT EXISTS public.swap_meet_spots (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  spot_size text NOT NULL DEFAULT '10x10' CHECK (spot_size IN ('10x10', '10x20')),
  waiver_file_path text,
  waiver_file_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_swap_meet_spots_event_id
  ON public.swap_meet_spots(event_id);

COMMENT ON TABLE public.swap_meet_spots IS
  'Reserved swap meet vendor spots per event.';

-- RLS for swap_meet_spots (same pattern as checklist_items)
ALTER TABLE public.swap_meet_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swap_meet_spots_select_org"
  ON public.swap_meet_spots FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "swap_meet_spots_insert_org"
  ON public.swap_meet_spots FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "swap_meet_spots_update_org"
  ON public.swap_meet_spots FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
  );

CREATE POLICY "swap_meet_spots_delete_org"
  ON public.swap_meet_spots FOR DELETE
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      WHERE e.organization_id = public.current_organization_id()
    )
  );
