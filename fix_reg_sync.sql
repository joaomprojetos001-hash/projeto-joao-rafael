-- FIX: Sync missing profiles from auth.users
-- This script finds users who exist in auth.users but NOT in public.profiles and inserts them.

DO $$
DECLARE
  missing_user RECORD;
  user_name TEXT;
  user_phone TEXT;
BEGIN
  FOR missing_user IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    -- Extract metadata
    user_name := missing_user.raw_user_meta_data->>'name';
    user_phone := missing_user.raw_user_meta_data->>'phone';
    
    -- Fallback name/phone if missing
    IF user_name IS NULL THEN user_name := 'User ' || substring(missing_user.email from 1 for 4); END IF;
    IF user_phone IS NULL THEN user_phone := ''; END IF;

    RAISE NOTICE 'Restoring profile for: % (%)', missing_user.email, missing_user.id;

    -- Insert Profile
    BEGIN
        INSERT INTO public.profiles (id, name, phone, role, is_approved)
        VALUES (
            missing_user.id,
            user_name,
            user_phone,
            'agent', -- Default role
            false    -- All restored users start as pending/false
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for %: %', missing_user.email, SQLERRM;
    END;

    -- Insert Default Company (PSC+TS) if no company relation exists
    BEGIN
        INSERT INTO public.user_companies (user_id, company_tag)
        VALUES (missing_user.id, 'PSC_TS')
        ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error assigning company for %: %', missing_user.email, SQLERRM;
    END;

  END LOOP;
END $$;

-- Verify results
SELECT * FROM public.profiles WHERE created_at > now() - interval '1 hour';
