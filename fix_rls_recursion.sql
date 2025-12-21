-- ============================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================
-- This fixes the "infinite recursion detected in policy for relation 'profiles'" error
-- by using SECURITY DEFINER functions instead of subqueries in RLS policies

-- STEP 1: Drop all existing RLS policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all user_products" ON public.user_products;
DROP POLICY IF EXISTS "Users can view own user_products" ON public.user_products;
DROP POLICY IF EXISTS "Admins can manage user_products" ON public.user_products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.user_products;

-- STEP 2: Create helper function to check if user is admin
-- SECURITY DEFINER allows this function to bypass RLS and check the role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- STEP 3: Create new RLS policies using the helper function

-- ============================================
-- Profiles Table Policies
-- ============================================

-- Allow users to view their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to view all profiles (uses helper function)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow admins to update any profile (for approving users)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- User Products Table Policies
-- ============================================

-- Allow users to view their own products
CREATE POLICY "Users can view own user_products"
  ON public.user_products FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to view all user products
CREATE POLICY "Admins can view all user_products"
  ON public.user_products FOR SELECT
  USING (public.is_admin());

-- Allow users to insert their own products during registration
CREATE POLICY "Users can insert own products"
  ON public.user_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all user products
CREATE POLICY "Admins can manage user_products"
  ON public.user_products FOR ALL
  USING (public.is_admin());

-- STEP 4: Verify your admin user exists
-- Replace with your actual user ID if different
INSERT INTO public.profiles (id, name, role, is_approved)
VALUES ('aac9e866-045e-47ea-99af-fe386c0e24bb', 'Super Admin', 'admin', true)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', is_approved = true;

-- STEP 5: Verify the fix
SELECT 'Policies updated successfully!' AS status;
SELECT * FROM public.profiles WHERE id = 'aac9e866-045e-47ea-99af-fe386c0e24bb';
