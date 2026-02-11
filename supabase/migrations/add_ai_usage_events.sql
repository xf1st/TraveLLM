-- Migration: Track AI usage events outside trips (e.g. map loading)

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  cost_rub NUMERIC(12, 4) NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_id ON public.ai_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_trip_id ON public.ai_usage_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_source ON public.ai_usage_events(source);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created_at ON public.ai_usage_events(created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_events_insert_own ON public.ai_usage_events;
CREATE POLICY ai_usage_events_insert_own ON public.ai_usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_usage_events_select_own ON public.ai_usage_events;
CREATE POLICY ai_usage_events_select_own ON public.ai_usage_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_usage_events_admin_all ON public.ai_usage_events;
CREATE POLICY ai_usage_events_admin_all ON public.ai_usage_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

GRANT SELECT, INSERT ON public.ai_usage_events TO authenticated;

COMMENT ON TABLE public.ai_usage_events IS 'Per-call AI usage records (map, chat, helpers)';
COMMENT ON COLUMN public.ai_usage_events.source IS 'Feature source, e.g. map.normalize-points';
COMMENT ON COLUMN public.ai_usage_events.meta IS 'Additional context about the usage event';
