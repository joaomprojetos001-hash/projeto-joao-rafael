-- Migration: 02_update_handle_new_user.sql
-- Description: Updates the handle_new_user trigger to assign companies from metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  product_id_val UUID;
  product_item JSONB;
  company_tag_val TEXT;
  company_item JSONB;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    'agent' -- Default role
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insert Products if provided
  IF NEW.raw_user_meta_data->'products' IS NOT NULL THEN
    FOR product_item IN SELECT * FROM jsonb_array_elements(NEW.raw_user_meta_data->'products')
    LOOP
      product_id_val := (product_item#>>'{}')::UUID;
      BEGIN
        INSERT INTO public.user_products (user_id, product_id)
        VALUES (NEW.id, product_id_val)
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to insert product: %', product_id_val;
      END;
    END LOOP;
  END IF;

  -- 3. Insert Companies if provided [NEW]
  -- Expecting 'companies' to be a JSON array of strings e.g. ["PSC_TS", "PSC_CONSORCIOS"]
  IF NEW.raw_user_meta_data->'companies' IS NOT NULL THEN
    FOR company_item IN SELECT * FROM jsonb_array_elements(NEW.raw_user_meta_data->'companies')
    LOOP
      company_tag_val := company_item#>>'{}';
      BEGIN
        -- Cast text to enum implicit or explicit if needed. 
        -- Since function is plpgsql, dynamic SQL or direct insert usually works if string matches enum label.
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
