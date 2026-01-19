-- Add venda_perdida to the allowed status values
-- First, let's check and update the constraint

-- Option 1: If using CHECK constraint, drop and recreate it
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('novo', 'em_atendimento', 'nao_respondido', 'em_negociacao', 'fechado', 'venda_perdida'));

-- Option 2: If using an ENUM type (less common but possible)
-- You would need to alter the type which is more complex

-- Verify the change
SELECT DISTINCT status FROM leads;
