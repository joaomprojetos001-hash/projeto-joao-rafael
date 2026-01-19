-- 1. Update company_tag for leads with 'Consórcios PF' or 'Consórcios PJ'
UPDATE leads 
SET company_tag = 'PSC_CONSORCIOS' 
WHERE (produto_interesse ILIKE '%Consórcios%' OR produto_interesse ILIKE '%Consórcio%') 
AND (company_tag IS NULL OR company_tag = '');

-- 2. Try to fix produto_interesse to be UUID instead of Text
-- First, find the product ID for Consórcio PF
DO $$ 
DECLARE 
    v_produto_id uuid;
BEGIN 
    -- Find ID for Consórcios PF
    SELECT id INTO v_produto_id FROM produtos WHERE nome ILIKE '%Consórcio PF%' OR nome ILIKE '%Consórcios PF%' LIMIT 1;
    
    IF v_produto_id IS NOT NULL THEN
        UPDATE leads 
        SET produto_interesse = v_produto_id::text 
        WHERE produto_interesse ILIKE '%Consórcio PF%' OR produto_interesse ILIKE '%Consórcios PF%';
    END IF;

    -- Find ID for Consórcios PJ
    SELECT id INTO v_produto_id FROM produtos WHERE nome ILIKE '%Consórcio PJ%' OR nome ILIKE '%Consórcios PJ%' LIMIT 1;
    
    IF v_produto_id IS NOT NULL THEN
        UPDATE leads 
        SET produto_interesse = v_produto_id::text 
        WHERE produto_interesse ILIKE '%Consórcio PJ%' OR produto_interesse ILIKE '%Consórcios PJ%';
    END IF;
END $$;
