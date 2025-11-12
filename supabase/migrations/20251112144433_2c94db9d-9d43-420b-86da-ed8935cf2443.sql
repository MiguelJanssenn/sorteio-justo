-- Atualizar constraint de tipo para aceitar todos os tipos de atividade
ALTER TABLE public.atividades 
DROP CONSTRAINT IF EXISTS atividades_tipo_check;

ALTER TABLE public.atividades
ADD CONSTRAINT atividades_tipo_check 
CHECK (tipo IN ('Plantão', 'Bloco', 'Enfermaria', 'Ambulatório'));