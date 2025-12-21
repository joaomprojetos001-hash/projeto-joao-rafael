-- ========================================
-- RUN THESE QUERIES IN SUPABASE SQL EDITOR
-- ========================================

-- 1. CHECK IF TABLES EXIST
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_products');

-- 2. CHECK IF YOUR PROFILE EXISTS
SELECT * FROM public.profiles WHERE id = 'aac9e866-045e-47ea-99af-fe386c0e24bb';

-- 3. IF PROFILE DOESN'T EXIST, CREATE IT (DISABLE RLS TEMPORARILY)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

INSERT INTO public.profiles (id, name, phone, role, is_approved)
VALUES ('aac9e866-045e-47ea-99af-fe386c0e24bb', 'Admin User', '11999999999', 'admin', true)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', is_approved = true, name = 'Admin User';

-- 4. RE-ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. VERIFY IT WORKED
SELECT * FROM public.profiles WHERE id = 'aac9e866-045e-47ea-99af-fe386c0e24bb';

-- 6. CHECK RLS POLICIES
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
