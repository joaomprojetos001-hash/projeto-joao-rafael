-- 1. Create the specific history table for PSC+TS Agent
CREATE TABLE IF NOT EXISTS public.histórico_mensagens_pscts (
  id SERIAL NOT NULL,
  session_id CHARACTER VARYING(255) NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT histórico_mensagens_pscts_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.sync_pscts_to_messages()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.messages (session_id, message, company_tag, created_at)
    VALUES (
        NEW.session_id, 
        NEW.message, 
        'PSC_TS', -- Hardcoded tag for this pipeline
        COALESCE(NEW.created_at, now())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the Trigger
DROP TRIGGER IF EXISTS trigger_sync_pscts ON public.histórico_mensagens_pscts;

CREATE TRIGGER trigger_sync_pscts
AFTER INSERT ON public.histórico_mensagens_pscts
FOR EACH ROW
EXECUTE FUNCTION public.sync_pscts_to_messages();
