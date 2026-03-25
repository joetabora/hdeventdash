-- User roles table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- RLS policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can insert/update/delete roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- IMPORTANT: After running this migration, manually insert an admin role
-- for your first user. Find your user ID in Supabase Auth > Users, then:
--
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('YOUR-USER-UUID-HERE', 'admin');
