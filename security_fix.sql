-- SECURITY UPDATE: Enable RLS and Restrict Access

-- 1. Enable RLS on Leads Table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Admins have full access" ON public.leads;
DROP POLICY IF EXISTS "Agents view assigned product leads" ON public.leads;
DROP POLICY IF EXISTS "Agents update assigned product leads" ON public.leads;
DROP POLICY IF EXISTS "Agents insert leads" ON public.leads;

-- 3. Policy: Admins have FULL ACCESS (Select, Insert, Update, Delete)
CREATE POLICY "Admins have full access"
ON public.leads
FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Policy: Agents can VIEW leads based on ASSIGNED PRODUCTS
-- Logic: Lead's 'produto_interesse' must match a 'product_id' in 'user_products' for this user.
CREATE POLICY "Agents view assigned product leads"
ON public.leads
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' -- Admins always pass
  OR
  auth.uid() IN (
    SELECT user_id 
    FROM public.user_products 
    WHERE product_id::text = leads.produto_interesse -- Cast to text if needed, assuming match
  )
);

-- Note: If 'produto_interesse' is a name/text in 'leads' but 'product_id' is UUID in 'user_products', filtering might fail without a JOIN.
-- Based on previous code, 'produto_interesse' in leads seems to hold the PRODUCT ID (UUID).
-- Checking DashboardPage code: "query.in('produto_interesse', productIds)". So leads.produto_interesse == UUID.

-- 5. Policy: Agents can UPDATE leads (e.g. change status) for assigned products
CREATE POLICY "Agents update assigned product leads"
ON public.leads
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.user_products 
    WHERE product_id::text = leads.produto_interesse
  )
);

-- 6. Policy: Agents can INSERT leads (Allow creation)
CREATE POLICY "Agents insert leads"
ON public.leads
FOR INSERT
WITH CHECK (
  true -- Generally allowed, or restrict if strictly needed.
);

-- 7. Ensure 'metrics' table is also secured or left open depending on usage.
-- For now, securing 'leads' is the priority.
