-- FIX: Drop the broken recursive RLS policies and replace with working ones
-- Run this in your Supabase SQL editor

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Step 2: Create a SECURITY DEFINER function to check admin status
-- This bypasses RLS, breaking the circular dependency
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 3: Create clean policies using the helper function

-- Any authenticated user can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all roles (uses the non-recursive helper)
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Admins can insert roles
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update roles
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Step 4: Verify your admin role exists
-- SELECT * FROM public.user_roles WHERE user_id = 'db2f0ac4-b983-4b9e-8d10-4f380f727fb7';
-- If the role shows 'staff', run:
-- UPDATE public.user_roles SET role = 'admin' WHERE user_id = 'db2f0ac4-b983-4b9e-8d10-4f380f727fb7';
