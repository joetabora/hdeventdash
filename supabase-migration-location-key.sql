-- Canonical location_key for events + monthly_budgets (logic/matching).
-- `location` remains human-readable display text. Run after budgets migration.

-- ---------------------------------------------------------------------------
-- 1. Normalize function (keep in sync with src/lib/location-key.ts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_location_key(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN ''
    ELSE regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(t)), '[^a-z0-9]+', '_', 'g'),
        '^_+|_+$',
        '',
        'g'
      ),
      '_+',
      '_',
      'g'
    )
  END;
$$;

COMMENT ON FUNCTION public.normalize_location_key(text) IS
  'Stable key from display location; used for budget caps and filters.';

-- ---------------------------------------------------------------------------
-- 2. events.location_key + sync trigger
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_key text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.events.location IS 'Display-only venue label';
COMMENT ON COLUMN public.events.location_key IS 'Canonical key for matching budgets/filters; derived from location';

UPDATE public.events
SET location_key = public.normalize_location_key(location);

CREATE OR REPLACE FUNCTION public.events_sync_location_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.location_key := public.normalize_location_key(NEW.location);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_sync_location_key ON public.events;
CREATE TRIGGER trg_events_sync_location_key
  BEFORE INSERT OR UPDATE OF location ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.events_sync_location_key();

-- ---------------------------------------------------------------------------
-- 3. monthly_budgets.location_key, merge dupes, new UNIQUE
-- ---------------------------------------------------------------------------

ALTER TABLE public.monthly_budgets
  ADD COLUMN IF NOT EXISTS location_key text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.monthly_budgets.location IS 'Display-only label for this cap row';
COMMENT ON COLUMN public.monthly_budgets.location_key IS 'Canonical key; must match events.location_key for the same venue';

UPDATE public.monthly_budgets
SET location_key = public.normalize_location_key(location);

-- Merge duplicate caps (same org + month + key): keep oldest row id, sum amounts
WITH dup_sums AS (
  SELECT
    organization_id,
    month,
    location_key,
    (array_agg(id ORDER BY created_at))[1] AS keep_id,
    sum(budget_amount)::numeric(12, 2) AS total_amt
  FROM public.monthly_budgets
  GROUP BY organization_id, month, location_key
  HAVING count(*) > 1
)
UPDATE public.monthly_budgets mb
SET budget_amount = d.total_amt
FROM dup_sums d
WHERE mb.id = d.keep_id;

DELETE FROM public.monthly_budgets mb
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      row_number() OVER (
        PARTITION BY organization_id, month, location_key
        ORDER BY created_at ASC
      ) AS rn
    FROM public.monthly_budgets
  ) x
  WHERE rn > 1
);

ALTER TABLE public.monthly_budgets
  DROP CONSTRAINT IF EXISTS monthly_budgets_organization_id_month_location_key;

ALTER TABLE public.monthly_budgets
  ADD CONSTRAINT monthly_budgets_org_month_location_key_unique
  UNIQUE (organization_id, month, location_key);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_org_month_key
  ON public.monthly_budgets(organization_id, month, location_key);

CREATE OR REPLACE FUNCTION public.monthly_budgets_sync_location_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.location_key := public.normalize_location_key(NEW.location);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_budgets_sync_location_key ON public.monthly_budgets;
CREATE TRIGGER trg_monthly_budgets_sync_location_key
  BEFORE INSERT OR UPDATE OF location ON public.monthly_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.monthly_budgets_sync_location_key();

COMMENT ON TABLE public.monthly_budgets IS
  'Cap per org per calendar month per location_key (location is display-only).';
