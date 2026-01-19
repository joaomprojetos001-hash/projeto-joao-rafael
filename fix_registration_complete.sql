-- ============================================
-- COMPREHENSIVE REGISTRATION FIX
-- Solves all user registration issues once and for all
-- ============================================

-- 1. Add EMAIL column to profiles (it was missing!)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Drop and recreate the handle_new_user function with ALL features
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  product_id_val UUID;
  product_item JSONB;
  company_tag_val TEXT;
  company_item JSONB;
BEGIN
  -- 1. Create Profile with EMAIL
  INSERT INTO public.profiles (id, name, phone, email, role, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,  -- Get email directly from auth.users
    'agent',    -- Default role
    false       -- Start unapproved
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email);

  -- 2. Insert Products if provided
  IF NEW.raw_user_meta_data->'products' IS NOT NULL THEN
    FOR product_item IN SELECT * FROM jsonb_array_elements(NEW.raw_user_meta_data->'products')
    LOOP
      BEGIN
        product_id_val := (product_item#>>'{}')::UUID;
        INSERT INTO public.user_products (user_id, product_id)
        VALUES (NEW.id, product_id_val)
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to insert product: %', product_id_val;
      END;
    END LOOP;
  END IF;

  -- 3. Insert Companies if provided
  IF NEW.raw_user_meta_data->'companies' IS NOT NULL THEN
    FOR company_item IN SELECT * FROM jsonb_array_elements(NEW.raw_user_meta_data->'companies')
    LOOP
      BEGIN
        company_tag_val := company_item#>>'{}';
        INSERT INTO public.user_companies (user_id, company_tag)
        VALUES (NEW.id, company_tag_val::company_tag)
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to insert company: %', company_tag_val;
      END;
    END LOOP;
  ELSE
    -- Default fallback if no company provided: PSC_TS
    INSERT INTO public.user_companies (user_id, company_tag)
    VALUES (NEW.id, 'PSC_TS')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. SYNC existing users: Update profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 6. SYNC existing users: Update name/phone from auth.users metadata where missing
UPDATE public.profiles p
SET 
  name = CASE 
    WHEN p.name IS NULL OR p.name = '' OR p.name LIKE 'User %' 
    THEN COALESCE(u.raw_user_meta_data->>'name', p.name) 
    ELSE p.name 
  END,
  phone = CASE 
    WHEN p.phone IS NULL OR p.phone = '' 
    THEN COALESCE(u.raw_user_meta_data->>'phone', p.phone) 
    ELSE p.phone 
  END
FROM auth.users u
WHERE p.id = u.id;

-- 7. SYNC: Insert missing products for users who have them in metadata
DO $$
DECLARE
  user_row RECORD;
  product_item JSONB;
  product_id_val UUID;
BEGIN
  FOR user_row IN 
    SELECT id, raw_user_meta_data 
    FROM auth.users 
    WHERE raw_user_meta_data->'products' IS NOT NULL
  LOOP
    FOR product_item IN SELECT * FROM jsonb_array_elements(user_row.raw_user_meta_data->'products')
    LOOP
      BEGIN
        product_id_val := (product_item#>>'{}')::UUID;
        INSERT INTO public.user_products (user_id, product_id)
        VALUES (user_row.id, product_id_val)
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors
      END;
    END LOOP;
  END LOOP;
END $$;

-- 8. SYNC: Insert missing companies for users who have them in metadata
DO $$
DECLARE
  user_row RECORD;
  company_item JSONB;
  company_tag_val TEXT;
BEGIN
  FOR user_row IN 
    SELECT id, raw_user_meta_data 
    FROM auth.users 
    WHERE raw_user_meta_data->'companies' IS NOT NULL
  LOOP
    FOR company_item IN SELECT * FROM jsonb_array_elements(user_row.raw_user_meta_data->'companies')
    LOOP
      BEGIN
        company_tag_val := company_item#>>'{}';
        INSERT INTO public.user_companies (user_id, company_tag)
        VALUES (user_row.id, company_tag_val::company_tag)
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors
      END;
    END LOOP;
  END LOOP;
END $$;

-- 9. Verify the fix
SELECT 
  p.id,
  p.name,
  p.email,
  p.phone,
  p.role,
  p.is_approved,
  (SELECT COUNT(*) FROM user_products up WHERE up.user_id = p.id) as product_count,
  (SELECT COUNT(*) FROM user_companies uc WHERE uc.user_id = p.id) as company_count
FROM public.profiles p
ORDER BY p.created_at DESC;
