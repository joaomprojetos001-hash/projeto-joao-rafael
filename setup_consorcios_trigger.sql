-- 1. Create the specific history table for PSC Consórcios Agent
CREATE TABLE IF NOT EXISTS public.histórico_mensagensconsorcios (
  id SERIAL NOT NULL,
  session_id CHARACTER VARYING(255) NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT histórico_mensagensconsorcios_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Ensure the 'company_tag' column exists in the main messages table
-- (Safe check in case it wasn't added by previous migrations)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS company_tag TEXT;

-- 3. Create the Trigger Function
-- This function runs on every insert to histórico_mensagensconsorcios
CREATE OR REPLACE FUNCTION public.sync_consorcios_to_messages()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.messages (session_id, message, company_tag, created_at)
    VALUES (
        NEW.session_id, 
        NEW.message, 
        'PSC_CONSORCIOS',
        COALESCE(NEW.created_at, now())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the Trigger
DROP TRIGGER IF EXISTS trigger_sync_consorcios ON public.histórico_mensagensconsorcios;

CREATE TRIGGER trigger_sync_consorcios
AFTER INSERT ON public.histórico_mensagensconsorcios
FOR EACH ROW
EXECUTE FUNCTION public.sync_consorcios_to_messages();

-- Verification Query (Run this after inserting a test record)
-- INSERT INTO public.histórico_mensagensconsorcios (session_id, message) VALUES ('test_num', '{"type": "text", "content": "test"}'::jsonb);
-- SELECT * FROM public.messages WHERE session_id = 'test_num';
