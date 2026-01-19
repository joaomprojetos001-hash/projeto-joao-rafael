-- Add whatsapp_instance_id to campanhas table
ALTER TABLE campanhas 
ADD COLUMN IF NOT EXISTS whatsapp_instance_id INT REFERENCES whatsapp_instances(id);

-- Optional: Add comment if needed
COMMENT ON COLUMN campanhas.whatsapp_instance_id IS 'Reference to the whatsapp_instances table (1=Linha 1, 2=Linha 2, 3=Linha 3)';
