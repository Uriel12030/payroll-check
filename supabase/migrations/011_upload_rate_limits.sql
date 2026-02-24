-- Migration 011: upload rate limiting (shared across all serverless instances)
-- ---------------------------------------------------------------------------
-- Stores per-IP upload counts in 15-minute windows.
-- Accessed only via service role; RLS enabled with no public policies.

CREATE TABLE IF NOT EXISTS upload_rate_limits (
  ip            text        NOT NULL,
  window_start  timestamptz NOT NULL,
  request_count int         NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

ALTER TABLE upload_rate_limits ENABLE ROW LEVEL SECURITY;
-- No public policies — table is only accessible via service role key

CREATE INDEX IF NOT EXISTS upload_rate_limits_window_idx
  ON upload_rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- check_upload_rate_limit(p_ip, p_max)
--
-- Atomically increments the request count for the current 15-min window.
-- Returns TRUE if the request is allowed (count <= p_max), FALSE otherwise.
-- Also purges entries older than 1 hour to keep the table small.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_upload_rate_limit(
  p_ip  text,
  p_max int DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window timestamptz;
  v_count  int;
BEGIN
  -- Floor to the current 15-minute window boundary
  v_window := date_trunc('hour', now())
    + floor(EXTRACT(MINUTE FROM now()) / 15) * interval '15 minutes';

  -- Atomic upsert: insert new row or increment existing count
  INSERT INTO upload_rate_limits (ip, window_start, request_count)
  VALUES (p_ip, v_window, 1)
  ON CONFLICT (ip, window_start)
  DO UPDATE SET request_count = upload_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  -- Opportunistic cleanup of old windows (best-effort, non-critical)
  DELETE FROM upload_rate_limits
  WHERE window_start < now() - interval '1 hour';

  RETURN v_count <= p_max;
END;
$$;
