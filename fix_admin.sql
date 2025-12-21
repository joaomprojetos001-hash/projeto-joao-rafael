-- Run this in Supabase SQL Editor to FORCE Admin access
-- Replace 'YOUR_USER_ID_HERE' with your actual User ID from Authentication > Users

INSERT INTO public.profiles (id, name, role, is_approved)
VALUES ('YOUR_USER_ID_HERE', 'Super Admin', 'admin', true)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', is_approved = true;
