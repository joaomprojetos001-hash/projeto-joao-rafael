-- Check if the user exists in auth.users
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'odumaisprepara@gmail.com';

-- Check if the user exists in public.profiles
SELECT * 
FROM public.profiles 
WHERE email = 'odumaisprepara@gmail.com'; -- Note: email might not be in profiles if trigger failed before update, but triggers usually use ID.
-- Better check by ID from the result above if possible, but for script we use logic.
-- Actually, profiles table definition has 'email'? 
-- Based on AdminApprovals.ts: interface UserProfile { email: string ... }
-- But let's check the query: .from('profiles').select('*')
-- Let's check schema of profiles.

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check user_companies
SELECT * 
FROM public.user_companies;

-- Check Enum values
SELECT enum_range(NULL::company_tag);
