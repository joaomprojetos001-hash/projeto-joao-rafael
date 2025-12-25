CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id SERIAL PRIMARY KEY,
    instance_name TEXT UNIQUE NOT NULL,
    is_connected BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial data for the 3 instances
INSERT INTO whatsapp_instances (id, instance_name, is_connected)
VALUES 
    (1, 'QR code 1', false),
    (2, 'QR code 2', false),
    (3, 'QR code 3', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (admin dashboard)
CREATE POLICY "Allow read access to whatsapp_instances" ON whatsapp_instances
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow update access for service role (if needed) or via dashboard if you plan to toggle it manually for testing
-- For now, allowing all authenticated to update for easier testing/integration
CREATE POLICY "Allow update access to whatsapp_instances" ON whatsapp_instances
    FOR UPDATE
    TO authenticated
    USING (true);
