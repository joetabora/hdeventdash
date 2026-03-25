-- Push notifications (FCM tokens + deduplication log)
-- Run in Supabase SQL Editor after main schema.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push token"
  ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Written only by service role (cron). No user policies.
CREATE TABLE IF NOT EXISTS public.notification_sent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_sent_event ON public.notification_sent(event_id);

ALTER TABLE public.notification_sent ENABLE ROW LEVEL SECURITY;
-- RLS enabled with no policies: authenticated users cannot read/write; service role bypasses RLS.
