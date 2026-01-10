-- Add company_tag to whatsapp_instances
ALTER TABLE whatsapp_instances
ADD COLUMN company_tag company_tag DEFAULT 'PSC_TS';

-- Set defaults
UPDATE whatsapp_instances SET company_tag = 'PSC_TS' WHERE id = 1;
UPDATE whatsapp_instances SET company_tag = 'PSC_CONSORCIOS' WHERE id = 2;
-- Line 3 defaults to PSC_TS or whatever, user can change.
