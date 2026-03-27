-- Non-negative CHECKs on events: budgets, revenue fields, attendance.
-- Run after supabase-migration-event-roi.sql and supabase-migration-budgets.sql
-- (columns must exist). monthly_budgets.budget_amount is already constrained
-- in supabase-migration-budgets.sql.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_planned_budget_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_planned_budget_nonnegative
  CHECK (planned_budget IS NULL OR planned_budget >= 0);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_actual_budget_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_actual_budget_nonnegative
  CHECK (actual_budget IS NULL OR actual_budget >= 0);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_sales_estimate_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_sales_estimate_nonnegative
  CHECK (sales_estimate IS NULL OR sales_estimate >= 0);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_roi_service_revenue_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_roi_service_revenue_nonnegative
  CHECK (roi_service_revenue IS NULL OR roi_service_revenue >= 0);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_roi_motorclothes_revenue_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_roi_motorclothes_revenue_nonnegative
  CHECK (roi_motorclothes_revenue IS NULL OR roi_motorclothes_revenue >= 0);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_roi_bike_sales_revenue_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_roi_bike_sales_revenue_nonnegative
  CHECK (roi_bike_sales_revenue IS NULL OR roi_bike_sales_revenue >= 0);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_attendance_nonnegative;
ALTER TABLE public.events ADD CONSTRAINT events_attendance_nonnegative
  CHECK (attendance IS NULL OR attendance >= 0);
