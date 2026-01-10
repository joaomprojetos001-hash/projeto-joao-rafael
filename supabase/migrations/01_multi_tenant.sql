-- Migration: 01_multi_tenant.sql
-- Description: Introduces Multi-Tenant structure with company_tag

-- 1. Create Enum for Company Tags
DO $$ BEGIN
    CREATE TYPE company_tag AS ENUM ('PSC_TS', 'PSC_CONSORCIOS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create User Companies Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_companies (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_tag company_tag NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, company_tag)
);

-- Enable RLS (Recommended practice, even if currently disabled globally)
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- 3. Add company_tag to existing tables
-- We default to 'PSC_TS' to support existing data migration
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS company_tag company_tag DEFAULT 'PSC_TS';

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS company_tag company_tag DEFAULT 'PSC_TS';

ALTER TABLE campanhas 
ADD COLUMN IF NOT EXISTS company_tag company_tag DEFAULT 'PSC_TS';

-- 4. Update Trigger Function to Propagate Tag
CREATE OR REPLACE FUNCTION auto_create_lead_from_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Now includes company_tag in the insert
  INSERT INTO leads (phone, name, status, is_ai_active, company_tag)
  VALUES (
      NEW.session_id, 
      'Novo Lead ' || NEW.session_id, 
      'nao_respondido', 
      true,
      NEW.company_tag -- Propagates the tag from the message
  )
  ON CONFLICT (phone) DO UPDATE 
  SET updated_at = now();
  -- Optional: Could also update company_tag on conflict if desired, 
  -- but usually safe to keep original attribution.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Policies for user_companies
-- Users can view their own companies
CREATE POLICY "Users can view own companies"
    ON user_companies FOR SELECT
    USING ( auth.uid() = user_id );

-- Admins can view all (assuming admin role check from profiles)
CREATE POLICY "Admins can view all user_companies"
    ON user_companies FOR SELECT
    USING ( 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
    );
