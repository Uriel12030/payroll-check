-- ============================================================
-- Migration 012: Analytics Events
-- Internal analytics tracking — page views, form events, CTA clicks.
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  event       text NOT NULL CHECK (event IN ('page_view', 'form_start', 'form_submit', 'cta_click')),
  lang        text NOT NULL DEFAULT 'he',
  source      text NOT NULL DEFAULT 'direct',
  campaign    text NOT NULL DEFAULT '',
  medium      text NOT NULL DEFAULT '',
  referrer    text NOT NULL DEFAULT '',
  device      text NOT NULL DEFAULT 'desktop' CHECK (device IN ('mobile', 'desktop')),
  path        text NOT NULL DEFAULT '/'
);

-- Indexes for the dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event   ON analytics_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date    ON analytics_events ((created_at::date));

-- RLS: service role only (public API route uses service client)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- No public policies — only service_role can read/write.

-- Daily aggregation view for fast dashboard queries
CREATE OR REPLACE VIEW analytics_daily AS
SELECT
  (created_at AT TIME ZONE 'Asia/Jerusalem')::date AS date,
  event,
  lang,
  source,
  campaign,
  device,
  count(*) AS cnt
FROM analytics_events
GROUP BY 1, 2, 3, 4, 5, 6;
