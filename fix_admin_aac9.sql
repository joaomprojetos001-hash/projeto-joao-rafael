-- EXECUTAR NO SUPABASE SQL EDITOR
-- Força a criação do perfil Admin para o ID específico fornecido: aac9e866-045e-47ea-99af-fe386c0e24bb

INSERT INTO public.profiles (id, name, role, is_approved)
VALUES ('aac9e866-045e-47ea-99af-fe386c0e24bb', 'Super Admin', 'admin', true)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', is_approved = true;

-- Verifica se salvou
SELECT * FROM public.profiles WHERE id = 'aac9e866-045e-47ea-99af-fe386c0e24bb';
