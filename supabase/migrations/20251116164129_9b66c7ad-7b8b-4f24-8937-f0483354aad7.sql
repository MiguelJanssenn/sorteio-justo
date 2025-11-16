-- Adicionar campos de dias da semana na tabela tipos_atividade_modelo
ALTER TABLE tipos_atividade_modelo 
ADD COLUMN IF NOT EXISTS dias_semana integer[] DEFAULT ARRAY[0,1,2,3,4,5,6],
ADD COLUMN IF NOT EXISTS permite_dias_uteis boolean DEFAULT true;