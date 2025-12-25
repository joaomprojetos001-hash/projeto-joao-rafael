-- Update the instance names to the new format
UPDATE whatsapp_instances SET instance_name = 'Linha 1' WHERE instance_name = 'QR code 1';
UPDATE whatsapp_instances SET instance_name = 'Linha 2' WHERE instance_name = 'QR code 2';
UPDATE whatsapp_instances SET instance_name = 'Linha 3' WHERE instance_name = 'QR code 3';

-- Insert if they didn't exist (using the new names)
INSERT INTO whatsapp_instances (id, instance_name, is_connected)
VALUES 
    (1, 'Linha 1', false),
    (2, 'Linha 2', false),
    (3, 'Linha 3', false)
ON CONFLICT (id) DO UPDATE 
SET instance_name = EXCLUDED.instance_name;
