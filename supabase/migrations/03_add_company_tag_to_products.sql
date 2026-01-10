-- Add company_tag to produtos table
ALTER TABLE produtos
ADD COLUMN company_tag company_tag DEFAULT 'PSC_TS';

-- Update specific products to PSC_CONSORCIOS
UPDATE produtos
SET company_tag = 'PSC_CONSORCIOS'
WHERE nome ILIKE '%Consórcio%';

-- For explicit safety, set others to PSC_TS (default already does this for new ones, but good to be sure for existing if any escaped)
UPDATE produtos
SET company_tag = 'PSC_TS'
WHERE company_tag IS NULL;

-- If necessary, create specific "Ademicon" product if user requested, but standardizing as Consórcio is probably enough for now unless they want a rename.
-- User said: "trabalhar exclusivamente com consórcios da ademicon".
-- I will assume existing "Consórcio PF" and "Consórcio PJ" are the ones.
