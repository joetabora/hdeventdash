-- Dashboard aggregates RPC: event counts, budget totals, ROI/analytics summaries.
-- Run after organizations, location_key, budgets, and RLS migrations.
-- Uses SECURITY INVOKER so RLS on events, checklist_items, and monthly_budgets applies.

CREATE OR REPLACE FUNCTION public.dashboard_aggregates(
  p_window_start date,
  p_window_end date,
  p_budget_month text,
  p_budget_location_key text DEFAULT '',
  p_search text DEFAULT '',
  p_location_key text DEFAULT '',
  p_owner text DEFAULT ''
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  base AS (
    SELECT
      e.id,
      e.name,
      e.date,
      e.description,
      e.owner,
      e.status,
      e.event_type,
      e.attendance,
      e.planned_budget,
      e.roi_leads_generated,
      e.roi_bikes_sold,
      e.roi_service_revenue,
      e.roi_motorclothes_revenue,
      e.roi_bike_sales_revenue,
      e.roi_event_cost,
      coalesce(e.location_key, public.normalize_location_key(e.location)) AS loc_key_eff,
      (
        coalesce(e.roi_service_revenue, 0)
        + coalesce(e.roi_motorclothes_revenue, 0)
        + coalesce(e.roi_bike_sales_revenue, 0)
      )::numeric AS roi_rev,
      (
        (coalesce(e.roi_leads_generated, 0) > 0)
        OR (coalesce(e.roi_bikes_sold, 0) > 0)
        OR coalesce(e.roi_service_revenue, 0) > 0
        OR coalesce(e.roi_motorclothes_revenue, 0) > 0
        OR coalesce(e.roi_bike_sales_revenue, 0) > 0
        OR coalesce(e.roi_event_cost, 0) > 0
      ) AS has_roi_flag
    FROM public.events e
    WHERE e.organization_id = public.current_organization_id()
      AND e.is_archived = false
      AND e.date >= p_window_start
      AND e.date <= p_window_end
  ),
  checklist_agg AS (
    SELECT
      c.event_id,
      count(*)::numeric AS total,
      sum(CASE WHEN c.is_checked THEN 1 ELSE 0 END)::numeric AS completed
    FROM public.checklist_items c
    WHERE EXISTS (SELECT 1 FROM base b WHERE b.id = c.event_id)
    GROUP BY c.event_id
  ),
  filtered AS (
    SELECT b.*
    FROM base b
    WHERE (
        nullif(trim(coalesce(p_search, '')), '') IS NULL
        OR b.name ILIKE '%' || trim(p_search) || '%'
        OR coalesce(b.description, '') ILIKE '%' || trim(p_search) || '%'
      )
      AND (
        nullif(trim(coalesce(p_location_key, '')), '') IS NULL
        OR b.loc_key_eff = trim(p_location_key)
      )
      AND (
        nullif(trim(coalesce(p_owner, '')), '') IS NULL
        OR b.owner = trim(p_owner)
      )
  ),
  snapshot AS (
    SELECT
      coalesce(sum(f.roi_rev) FILTER (WHERE f.roi_rev > 0), 0)::numeric AS total_revenue,
      count(*) FILTER (WHERE f.roi_rev > 0)::int AS events_with_revenue,
      round(
        avg(f.attendance) FILTER (WHERE f.attendance IS NOT NULL AND f.attendance >= 0)
      )::int AS avg_attendance,
      count(*) FILTER (WHERE f.attendance IS NOT NULL AND f.attendance >= 0)::int
        AS events_with_attendance,
      round(
        avg(
          CASE WHEN ca.total > 0 THEN 100.0 * ca.completed / ca.total END
        )
      )::int AS avg_checklist_completion,
      count(*)::int AS event_count
    FROM filtered f
    LEFT JOIN checklist_agg ca ON ca.event_id = f.id
  ),
  attendance AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'date', f.date::text,
          'attendance', f.attendance::int
        )
        ORDER BY f.date::date, f.name
      ),
      '[]'::jsonb
    ) AS j
    FROM filtered f
    WHERE f.attendance IS NOT NULL AND f.attendance >= 0
  ),
  type_agg AS (
    SELECT
      coalesce(f.event_type::text, '__uncategorized__') AS type_key,
      count(*)::int AS cnt,
      sum(f.roi_rev)::numeric AS total_rev,
      round(
        avg(f.attendance) FILTER (WHERE f.attendance IS NOT NULL AND f.attendance >= 0)
      )::int AS avg_attendance,
      round(
        avg(CASE WHEN ca.total > 0 THEN 100.0 * ca.completed / ca.total END)
      )::int AS avg_checklist_completion
    FROM filtered f
    LEFT JOIN checklist_agg ca ON ca.event_id = f.id
    GROUP BY 1
  ),
  type_rows AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'key', type_key,
          'count', cnt,
          'avg_revenue', round((total_rev / NULLIF(cnt, 0))::numeric, 2),
          'total_revenue', round(total_rev::numeric, 2),
          'avg_attendance', avg_attendance,
          'avg_checklist_completion', avg_checklist_completion
        )
        ORDER BY
          (total_rev / NULLIF(cnt, 0)) DESC NULLS LAST,
          total_rev DESC,
          cnt DESC
      ),
      '[]'::jsonb
    ) AS j
    FROM type_agg
  ),
  roi_base AS (
    SELECT f.*
    FROM filtered f
    WHERE f.roi_rev > 0 OR f.has_roi_flag
  ),
  roi_rows AS (
    SELECT
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'date', r.date::text,
            'revenue', round(r.roi_rev::numeric, 2)
          )
          ORDER BY r.date::date, r.name
        ),
        '[]'::jsonb
      ) AS rows_json,
      coalesce(max(r.roi_rev), 0)::numeric AS max_rev,
      (SELECT count(*)::int FROM roi_base) AS n_events
    FROM roi_base r
  ),
  roi_running AS (
    SELECT
      coalesce(
        jsonb_agg(
          jsonb_build_object('id', id, 'running', round(running::numeric, 2))
          ORDER BY dt, nm
        ),
        '[]'::jsonb
      ) AS running_json,
      coalesce(max(running), 0)::numeric AS max_running
    FROM (
      SELECT
        r.id,
        r.date::date AS dt,
        r.name AS nm,
        sum(r.roi_rev) OVER (ORDER BY r.date::date, r.name) AS running
      FROM roi_base r
    ) x
  ),
  roi_totals AS (
    SELECT coalesce(sum(r.roi_rev), 0)::numeric AS total_tracked
    FROM roi_base r
  ),
  budget_planned AS (
    SELECT coalesce(
      sum(
        coalesce(e.planned_budget, 0)
        + coalesce(cl.checklist_estimated, 0)
      ),
      0
    )::numeric AS v
    FROM public.events e
    LEFT JOIN (
      SELECT
        c.event_id,
        coalesce(sum(coalesce(c.estimated_cost, 0)), 0)::numeric AS checklist_estimated
      FROM public.checklist_items c
      GROUP BY c.event_id
    ) cl ON cl.event_id = e.id
    WHERE e.organization_id = public.current_organization_id()
      AND e.is_archived = false
      AND e.date >= p_window_start
      AND e.date <= p_window_end
      AND to_char(e.date::date, 'YYYY-MM') = left(trim(coalesce(p_budget_month, '')), 7)
      AND (
        nullif(trim(coalesce(p_budget_location_key, '')), '') IS NULL
        OR coalesce(e.location_key, public.normalize_location_key(e.location))
          = trim(p_budget_location_key)
      )
  ),
  budget_cap AS (
    SELECT
      CASE
        WHEN nullif(trim(coalesce(p_budget_location_key, '')), '') IS NULL THEN
          coalesce(
            (
              SELECT sum(m.budget_amount)::numeric
              FROM public.monthly_budgets m
              WHERE m.organization_id = public.current_organization_id()
                AND m.month = (left(trim(coalesce(p_budget_month, '2000-01')), 7) || '-01')::date
            ),
            0
          )
        ELSE
          coalesce(
            (
              SELECT m.budget_amount
              FROM public.monthly_budgets m
              WHERE m.organization_id = public.current_organization_id()
                AND m.month = (left(trim(coalesce(p_budget_month, '2000-01')), 7) || '-01')::date
                AND m.location_key = trim(p_budget_location_key)
              LIMIT 1
            ),
            0
          )
      END::numeric AS v
  ),
  metrics AS (
    SELECT
      (SELECT count(*)::int FROM base b WHERE b.date::date >= current_date AND b.status <> 'completed')
        AS upcoming_count,
      (
        SELECT count(*)::int
        FROM base b
        INNER JOIN checklist_agg ca ON ca.event_id = b.id
        WHERE b.status NOT IN ('completed', 'live_event')
          AND ca.total > 0
          AND ca.completed < ca.total
          AND (b.date::date - current_date) >= 0
          AND (b.date::date - current_date) <= 5
      ) AS at_risk_count,
      coalesce(
        (
          SELECT round(avg(100.0 * ca.completed / ca.total))::int
          FROM base b
          INNER JOIN checklist_agg ca ON ca.event_id = b.id
          WHERE ca.total > 0
        ),
        0
      ) AS avg_completion,
      coalesce(
        (
          SELECT round(
            avg(
              (
                (CASE WHEN ca.total > 0 THEN ca.completed / ca.total ELSE 0 END) * 0.7
                + (
                  CASE b.status
                    WHEN 'idea' THEN 0
                    WHEN 'planning' THEN 0.2
                    WHEN 'in_progress' THEN 0.4
                    WHEN 'ready_for_execution' THEN 0.7
                    WHEN 'live_event' THEN 0.9
                    WHEN 'completed' THEN 1.0
                    ELSE 0
                  END
                ) * 0.3
              ) * 10
            )::numeric,
            4
          )::numeric
          FROM base b
          LEFT JOIN checklist_agg ca ON ca.event_id = b.id
        ),
        0
      ) AS avg_score,
      (SELECT count(*)::int FROM base) AS total_events
  )
  SELECT jsonb_build_object(
    'budget',
    jsonb_build_object(
      'planned_spend', (SELECT v FROM budget_planned),
      'monthly_cap', (SELECT v FROM budget_cap)
    ),
    'metrics',
    jsonb_build_object(
      'upcoming_count', m.upcoming_count,
      'at_risk_count', m.at_risk_count,
      'avg_completion', m.avg_completion,
      'avg_score', m.avg_score,
      'total_events', m.total_events
    ),
    'filtered',
    jsonb_build_object(
      'snapshot',
      jsonb_build_object(
        'total_revenue', round(s.total_revenue, 2),
        'events_with_revenue', s.events_with_revenue,
        'avg_attendance', s.avg_attendance,
        'events_with_attendance', s.events_with_attendance,
        'avg_checklist_completion', s.avg_checklist_completion,
        'event_count', s.event_count
      ),
      'attendance_series', (SELECT j FROM attendance),
      'by_event_type', (SELECT j FROM type_rows),
      'roi_trends',
      jsonb_build_object(
        'rows', rr.rows_json,
        'running_totals', run.running_json,
        'total_tracked', round(rt.total_tracked, 2),
        'max_rev',
        CASE
          WHEN rr.n_events = 0 THEN 1
          ELSE greatest(rr.max_rev, 1::numeric)
        END,
        'max_running',
        CASE
          WHEN rr.n_events = 0 THEN 1
          ELSE greatest(run.max_running, 1::numeric)
        END
      )
    )
  )
  FROM snapshot s
  CROSS JOIN roi_rows rr
  CROSS JOIN roi_running run
  CROSS JOIN roi_totals rt
  CROSS JOIN metrics m;
$$;

COMMENT ON FUNCTION public.dashboard_aggregates(date, date, text, text, text, text, text) IS
  'Org-scoped dashboard JSON: budget planned/cap, headline metrics, filtered analytics + ROI trends.';

GRANT EXECUTE ON FUNCTION public.dashboard_aggregates(date, date, text, text, text, text, text)
  TO authenticated;
